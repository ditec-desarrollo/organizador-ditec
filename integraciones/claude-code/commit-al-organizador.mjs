#!/usr/bin/env node
// Hook de Claude Code (PostToolUse): después de cada comando que hace un `git commit`,
// le avisa el commit al Organizador (POST /integraciones/commits), que crea la tarea.
//
// Claude Code le pasa por la entrada estándar un JSON con el comando que acaba de correr
// (tool_input.command) y la carpeta de la sesión (cwd). No trae el commit: se lee con git.
//
// Reglas de este script:
//   · nunca interrumpe a Claude: pase lo que pase termina con código 0 y sin escribir en la salida;
//   · lo que pasó queda en hook.log, en la carpeta de configuración;
//   · si el Organizador no responde, el commit queda en cola y se reenvía en el próximo commit.
//
// Se instala con instalar.mjs (ver README.md). No tiene dependencias: usa lo que trae Node 18 o superior.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Carpeta con config.json, hook.log, enviados.json y cola.json.
const CARPETA = process.env.ORGANIZADOR_HOOK_DIR || path.join(os.homedir(), ".claude", "organizador");
const archivo = (nombre) => path.join(CARPETA, nombre);

const MAX_MENSAJE = 10000; // el mismo tope que valida el back
const MAX_ENVIADOS = 500;
const MAX_COLA = 100;
const ESPERA_MS = 10000;
// Un commit cuenta como "recién hecho" si es de los últimos minutos (más lo que tardó el comando).
const MARGEN_MS = 2 * 60 * 1000;

const leerJson = (nombre, porDefecto) => {
  try {
    return JSON.parse(fs.readFileSync(archivo(nombre), "utf8"));
  } catch {
    return porDefecto;
  }
};

const guardarJson = (nombre, datos) => {
  fs.mkdirSync(CARPETA, { recursive: true });
  fs.writeFileSync(archivo(nombre), JSON.stringify(datos, null, 2));
};

const anotar = (texto) => {
  try {
    fs.mkdirSync(CARPETA, { recursive: true });
    fs.appendFileSync(archivo("hook.log"), `${new Date().toISOString()} ${texto}\n`);
  } catch {
    // Sin log no se puede avisar de nada más: se sigue.
  }
};

// ───────────── Qué comando es ─────────────

// Un argumento del comando: puede llevar partes entre comillas ("C:/mi carpeta", --author="A B").
const ARGUMENTO = `(?:"[^"]*"|'[^']*'|[^\\s;&|"'])+`;
// `git commit`, con las opciones que git acepta antes del subcomando (`git -C carpeta -c clave=valor commit`),
// en cualquier parte del comando (`git add . && git commit -m "…"`).
// Si matchea de más no pasa nada: después solo se mandan commits que existan y sean recientes.
const GIT_COMMIT = new RegExp(`(?:^|[\\s;&|(])git(?:\\.exe)?(?:\\s+-[Cc]\\s+${ARGUMENTO}|\\s+--?[\\w-]+(?:=${ARGUMENTO})?)*\\s+commit(?=\\s|$)`);
export const haceCommit = (comando) => GIT_COMMIT.test(String(comando ?? ""));

const sinComillas = (texto) => texto.replace(/^(["'])(.*)\1$/, "$2");

// Git Bash escribe las unidades de Windows como /c/Users/…: Node necesita c:/Users/…
const rutaLocal = (carpeta) => (process.platform === "win32" ? carpeta.replace(/^\/([A-Za-z])(?=\/|$)/, "$1:") : carpeta);

// Carpetas donde pudo haberse hecho el commit: la de la sesión, y las que nombre el comando
// con `git -C <carpeta>` o `cd <carpeta>`.
export const carpetasDelComando = (comando, cwd) => {
  const carpetas = [cwd];
  const patron = /(?:\bgit(?:\.exe)?\s+-C|\b(?:cd|pushd|Set-Location|sl)(?:\s+-(?:Path|LiteralPath))?)\s+("[^"]+"|'[^']+'|[^\s;&|]+)/gi;
  for (const [, carpeta] of String(comando ?? "").matchAll(patron)) {
    carpetas.push(path.resolve(cwd, rutaLocal(sinComillas(carpeta))));
  }
  return [...new Set(carpetas.filter(Boolean))];
};

// La URL del remoto puede traer usuario y token (https://usuario:token@github.com/…): no se mandan.
export const sinCredenciales = (url) => String(url ?? "").replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]*@/i, "$1");

// ───────────── Git ─────────────

const git = (carpeta, ...argumentos) =>
  execFileSync("git", ["-C", carpeta, ...argumentos], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true }).trim();

const intentar = (funcion, porDefecto = "") => {
  try {
    return funcion();
  } catch {
    return porDefecto;
  }
};

const SEPARADOR_CAMPO = "\x1f";
const SEPARADOR_COMMIT = "\x1e";

// Commits de HEAD hechos desde `desde` (milisegundos), del más viejo al más nuevo.
const commitsRecientes = (raiz, desde) => {
  // %x1f y %x1e: git escribe esos separadores, que no pueden aparecer en un mensaje de commit.
  const formato = `${["%H", "%P", "%an", "%ae", "%cI", "%B"].join("%x1f")}%x1e`;
  const salida = intentar(() => git(raiz, "log", "-20", `--since=${new Date(desde).toISOString()}`, `--format=${formato}`));
  return salida
    .split(SEPARADOR_COMMIT)
    .map((bloque) => bloque.replace(/^\s+/, ""))
    .filter(Boolean)
    .map((bloque) => {
      const [commit_sha, padres, autor_nombre, autor_email, fecha, mensaje = ""] = bloque.split(SEPARADOR_CAMPO);
      return { commit_sha, es_merge: padres.trim().split(/\s+/).filter(Boolean).length > 1, autor_nombre, autor_email, fecha, mensaje: mensaje.trim() };
    })
    .reverse();
};

const datosDelRepo = (raiz) => {
  const remoto =
    intentar(() => git(raiz, "remote", "get-url", "origin")) ||
    intentar(() => {
      const primero = git(raiz, "remote").split(/\r?\n/).filter(Boolean)[0];
      return primero ? git(raiz, "remote", "get-url", primero) : "";
    });
  const carpeta = path.basename(raiz);
  const rama = intentar(() => git(raiz, "rev-parse", "--abbrev-ref", "HEAD"));
  return {
    // Sin remoto, el repo se identifica por el nombre de su carpeta.
    repositorio: sinCredenciales(remoto) || carpeta,
    carpeta,
    rama: rama && rama !== "HEAD" ? rama : null,
  };
};

// ───────────── Envío ─────────────

// Devuelve true si el Organizador recibió el commit (aunque lo deje pendiente o lo rechace por inválido):
// en esos casos reintentar no cambia nada. false = no se pudo entregar, hay que reintentar.
const enviar = async (config, commit) => {
  const etiqueta = `${commit.commit_sha.slice(0, 7)} ${commit.repositorio}`;
  try {
    const respuesta = await fetch(`${config.url.replace(/\/+$/, "")}/integraciones/commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": config.apiKey },
      body: JSON.stringify(commit),
      signal: AbortSignal.timeout(ESPERA_MS),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.ok) {
      anotar(`${etiqueta} -> ${datos.resultado}${datos.repetido ? " (ya estaba)" : ""}: ${datos.detalle ?? ""}`);
      return true;
    }
    anotar(`${etiqueta} -> HTTP ${respuesta.status}: ${datos.message ?? ""} ${datos.errores ? JSON.stringify(datos.errores) : ""}`);
    // 400: el commit no pasa la validación y no va a pasar nunca. El resto (clave, servidor caído) se reintenta.
    return respuesta.status === 400;
  } catch (error) {
    anotar(`${etiqueta} -> sin conexión con el Organizador (${error.cause?.code ?? error.cause?.errors?.[0]?.code ?? error.name}): queda en cola`);
    return false;
  }
};

const principal = async () => {
  const entrada = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const comando = entrada.tool_input?.command;
  if (!haceCommit(comando)) return;

  const config = leerJson("config.json", null);
  if (!config?.url || !config?.apiKey) {
    anotar("Falta config.json con url y apiKey: corré instalar.mjs (ver README.md)");
    return;
  }

  const enviados = leerJson("enviados.json", []);
  let cola = leerJson("cola.json", []);
  const cwd = entrada.cwd || process.cwd();
  const desde = Date.now() - (Number(entrada.duration_ms) || 0) - MARGEN_MS;

  const raices = [...new Set(carpetasDelComando(comando, cwd).map((carpeta) => intentar(() => git(carpeta, "rev-parse", "--show-toplevel"))))].filter(Boolean);

  for (const raiz of raices) {
    // --amend reemplaza un commit por otro con otro hash: si el original ya se avisó, la tarea ya existe.
    if (/\s--amend(\s|$)/.test(comando)) {
      const original = intentar(() => git(raiz, "rev-parse", "HEAD@{1}"));
      if (enviados.includes(original)) {
        anotar(`${path.basename(raiz)}: --amend de ${original.slice(0, 7)}, que ya se había avisado: no se manda de nuevo`);
        enviados.push(intentar(() => git(raiz, "rev-parse", "HEAD")));
        continue;
      }
    }

    const repo = datosDelRepo(raiz);
    for (const commit of commitsRecientes(raiz, desde)) {
      if (enviados.includes(commit.commit_sha) || cola.some((pendiente) => pendiente.commit_sha === commit.commit_sha)) continue;
      cola.push({
        ...commit,
        ...repo,
        mensaje: commit.mensaje.slice(0, MAX_MENSAJE) || "(sin mensaje)",
        // Identidad fija de esta máquina, por si git firma con un nombre compartido.
        autor_alias: config.autor || null,
      });
    }
  }

  // Primero lo que había quedado de antes, después lo nuevo.
  const sinEntregar = [];
  for (const commit of cola) {
    if (await enviar(config, commit)) enviados.push(commit.commit_sha);
    else sinEntregar.push(commit);
  }

  guardarJson("enviados.json", enviados.filter(Boolean).slice(-MAX_ENVIADOS));
  guardarJson("cola.json", sinEntregar.slice(-MAX_COLA));
};

// Solo corre como hook cuando se lo ejecuta directo (no cuando las pruebas importan sus funciones).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal()
    .catch((error) => anotar(`ERROR del hook: ${error.stack ?? error}`))
    .finally(() => process.exit(0));
}
