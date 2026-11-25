// Pruebas del hook. Desde la raíz del repo:
//   node --test integraciones/claude-code/commit-al-organizador.test.mjs
//
// La última arma un repositorio de git y un servidor falsos en una carpeta temporal y corre el hook
// de verdad, como lo corre Claude Code: no toca la configuración de esta máquina ni llama al Organizador.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { carpetasDelComando, haceCommit, sinCredenciales } from "./commit-al-organizador.mjs";

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "commit-al-organizador.mjs");

test("reconoce un git commit dentro de cualquier comando", () => {
  for (const comando of [
    'git commit -m "listo"',
    'git add . && git commit -m "listo"',
    'cd back; git commit -am "x"',
    'git -C "C:/Users/usuario/Desktop/mi repo" commit -m "x"',
    'git -c user.name="Otro Nombre" commit --amend --no-edit',
    "git --no-pager commit",
    "git.exe commit -m x",
    "git commit -m @'\nvarias líneas\n'@",
  ]) {
    assert.equal(haceCommit(comando), true, comando);
  }
});

test("no confunde otros comandos con un commit", () => {
  for (const comando of [
    "git status",
    "git log --grep commit",
    "git show commit-al-organizador.mjs",
    'echo "git commit"x',
    "npm run commit",
    "git commit-tree abc",
    "gitk commit",
    "",
    undefined,
  ]) {
    assert.equal(haceCommit(comando), false, String(comando));
  }
});

test("busca el repositorio en la carpeta de la sesión y en las que nombra el comando", () => {
  const cwd = path.resolve(os.tmpdir(), "sesion");
  assert.deepEqual(carpetasDelComando('git commit -m "x"', cwd), [cwd]);
  assert.deepEqual(carpetasDelComando('cd back && git commit -m "x"', cwd), [cwd, path.join(cwd, "back")]);
  assert.deepEqual(carpetasDelComando('git -C "../otro repo" commit -m "x"', cwd), [cwd, path.resolve(cwd, "../otro repo")]);
  assert.deepEqual(carpetasDelComando("Set-Location front; git commit -m x", cwd), [cwd, path.join(cwd, "front")]);
});

test("el usuario y el token de la URL del remoto no se envían", () => {
  assert.equal(sinCredenciales("https://usuario:ghp_secreto@github.com/org/repo.git"), "https://github.com/org/repo.git");
  assert.equal(sinCredenciales("https://github.com/org/repo.git"), "https://github.com/org/repo.git");
  assert.equal(sinCredenciales("git@github.com:org/repo.git"), "git@github.com:org/repo.git");
  assert.equal(sinCredenciales(""), "");
});

// ───────────── De punta a punta ─────────────

const git = (carpeta, ...argumentos) => execFileSync("git", ["-C", carpeta, ...argumentos], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// Corre el hook como lo hace Claude Code: el JSON del evento por la entrada estándar.
const correrHook = (carpetaHook, evento) =>
  new Promise((resolve) => {
    // spawnSync bloquearía al servidor falso de este mismo proceso: se corre aparte y se espera.
    import("node:child_process").then(({ spawn }) => {
      const hijo = spawn(process.execPath, [HOOK], { env: { ...process.env, ORGANIZADOR_HOOK_DIR: carpetaHook }, stdio: ["pipe", "pipe", "pipe"] });
      let salida = "";
      hijo.stdout.on("data", (dato) => (salida += dato));
      hijo.stderr.on("data", (dato) => (salida += dato));
      hijo.on("close", (codigo) => resolve({ codigo, salida }));
      hijo.stdin.end(JSON.stringify(evento));
    });
  });

test("de punta a punta: avisa el commit recién hecho, una sola vez, y reintenta si el back no responde", async (t) => {
  if (spawnSync("git", ["--version"]).status !== 0) return t.skip("git no está instalado");

  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "hook-organizador-"));
  const repo = path.join(temporal, "Repo De Prueba");
  const carpetaHook = path.join(temporal, "config");
  fs.mkdirSync(repo);
  fs.mkdirSync(carpetaHook);

  const recibidos = [];
  let responder = true;
  const servidor = http.createServer((req, res) => {
    let cuerpo = "";
    req.on("data", (dato) => (cuerpo += dato));
    req.on("end", () => {
      if (!responder) return res.writeHead(500, { "Content-Type": "application/json" }).end('{"message":"caído"}');
      recibidos.push({ ruta: `${req.method} ${req.url}`, clave: req.headers["x-api-key"], ...JSON.parse(cuerpo) });
      res.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify({ resultado: "TAREA_CREADA", detalle: "Se creó la tarea #1" }));
    });
  });
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    servidor.close();
    fs.rmSync(temporal, { recursive: true, force: true });
  });

  fs.writeFileSync(
    path.join(carpetaHook, "config.json"),
    JSON.stringify({ url: `http://127.0.0.1:${servidor.address().port}/`, apiKey: "clave-de-prueba", autor: "maquina-de-prueba" }),
  );

  git(repo, "init", "-q");
  git(repo, "config", "user.name", "Persona De Prueba");
  git(repo, "config", "user.email", "persona@prueba.test");
  git(repo, "config", "commit.gpgsign", "false");
  git(repo, "remote", "add", "origin", "https://usuario:token-secreto@github.com/ditec-desarrollo/Repo-De-Prueba.git");
  const commitear = (nombre, mensaje) => {
    fs.writeFileSync(path.join(repo, nombre), nombre);
    git(repo, "add", ".");
    git(repo, "commit", "-q", "-m", mensaje);
    return git(repo, "rev-parse", "HEAD");
  };
  const evento = (comando, cwd = repo) => ({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: comando }, cwd, duration_ms: 500 });
  const leer = (nombre) => JSON.parse(fs.readFileSync(path.join(carpetaHook, nombre), "utf8"));

  // 1. Un commit: llega con todos sus datos y sin las credenciales del remoto.
  const primero = commitear("a.txt", "Primer commit de prueba\n\nCon un cuerpo de dos líneas.\nSegunda línea.");
  let corrida = await correrHook(carpetaHook, evento('git add . && git commit -m "Primer commit de prueba"'));
  assert.equal(corrida.codigo, 0);
  assert.equal(corrida.salida, "", "el hook no escribe nada: su salida le llegaría a Claude");
  assert.equal(recibidos.length, 1);
  assert.equal(recibidos[0].ruta, "POST /integraciones/commits");
  assert.equal(recibidos[0].clave, "clave-de-prueba");
  assert.equal(recibidos[0].commit_sha, primero);
  assert.equal(recibidos[0].repositorio, "https://github.com/ditec-desarrollo/Repo-De-Prueba.git");
  assert.equal(recibidos[0].carpeta, "Repo De Prueba");
  assert.equal(recibidos[0].autor_nombre, "Persona De Prueba");
  assert.equal(recibidos[0].autor_email, "persona@prueba.test");
  assert.equal(recibidos[0].autor_alias, "maquina-de-prueba");
  assert.equal(recibidos[0].mensaje, "Primer commit de prueba\n\nCon un cuerpo de dos líneas.\nSegunda línea.");
  assert.equal(recibidos[0].es_merge, false);
  assert.match(recibidos[0].fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  assert.ok(["master", "main"].includes(recibidos[0].rama));

  // 2. Otro comando que no es un commit, o el mismo commit otra vez: no se manda nada.
  await correrHook(carpetaHook, evento("git status"));
  await correrHook(carpetaHook, evento('git commit -m "nada para commitear"'));
  assert.equal(recibidos.length, 1);

  // 3. El back no responde: el commit queda en cola y sale con el próximo.
  responder = false;
  const segundo = commitear("b.txt", "Segundo commit");
  // La sesión está en otra carpeta y el comando nombra el repo con -C.
  await correrHook(carpetaHook, evento(`git -C "${repo.replace(/\\/g, "/")}" commit -m "Segundo commit"`, temporal));
  assert.equal(recibidos.length, 1);
  assert.deepEqual(leer("cola.json").map((c) => c.commit_sha), [segundo]);

  responder = true;
  const tercero = commitear("c.txt", "Tercer commit");
  await correrHook(carpetaHook, evento('git commit -m "Tercer commit"'));
  assert.deepEqual(recibidos.slice(1).map((c) => c.commit_sha), [segundo, tercero]);
  assert.deepEqual(leer("cola.json"), []);
  assert.deepEqual(leer("enviados.json"), [primero, segundo, tercero]);

  // 4. --amend de un commit ya avisado: cambia el hash pero es el mismo trabajo, no se manda de nuevo.
  git(repo, "commit", "-q", "--amend", "-m", "Tercer commit (corregido)");
  await correrHook(carpetaHook, evento('git commit --amend -m "Tercer commit (corregido)"'));
  assert.equal(recibidos.length, 3);

  const log = fs.readFileSync(path.join(carpetaHook, "hook.log"), "utf8");
  assert.match(log, /TAREA_CREADA: Se creó la tarea #1/);
  assert.match(log, /HTTP 500/);
  assert.match(log, /--amend/);
});
