#!/usr/bin/env node
// Instala en esta máquina el hook que le avisa cada commit de Claude Code al Organizador.
//
//   node integraciones/claude-code/instalar.mjs --url https://estadisticas.smt.gob.ar:5066
//   node integraciones/claude-code/instalar.mjs --url … --autor "mi-alias"
//   node integraciones/claude-code/instalar.mjs --desinstalar
//
// Qué hace:
//   1. copia commit-al-organizador.mjs a ~/.claude/organizador/
//   2. guarda ahí config.json con la URL del back, la clave de integración y (opcional) el autor
//   3. agrega el hook a ~/.claude/settings.json (antes deja una copia de ese archivo)
//   4. verifica que el back responda y que la clave sea la correcta
//
// La clave de integración (INTEGRACION_API_KEY del .env del back) se pide por teclado, o se toma de la
// variable de entorno ORGANIZADOR_API_KEY. No se pasa como argumento para que no quede en el historial.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const HOOK = "commit-al-organizador.mjs";
const ORIGEN = path.join(path.dirname(fileURLToPath(import.meta.url)), HOOK);

const argumento = (nombre) => {
  const indice = process.argv.indexOf(`--${nombre}`);
  return indice === -1 ? undefined : (process.argv[indice + 1] ?? "");
};
const tiene = (nombre) => process.argv.includes(`--${nombre}`);

const CARPETA = process.env.ORGANIZADOR_HOOK_DIR || path.join(os.homedir(), ".claude", "organizador");
const SETTINGS = argumento("settings") || path.join(os.homedir(), ".claude", "settings.json");
const DESTINO = path.join(CARPETA, HOOK);
const CONFIG = path.join(CARPETA, "config.json");

const leerJson = (ruta, porDefecto) => {
  if (!fs.existsSync(ruta)) return porDefecto;
  // Si el archivo existe pero no se puede leer, se corta: no se pisa una configuración que no se entiende.
  return JSON.parse(fs.readFileSync(ruta, "utf8"));
};

const esDelOrganizador = (entrada) => (entrada.hooks ?? []).some((hook) => String(hook.command ?? "").includes(HOOK));

// La entrada del hook: después de cada comando de consola (Bash o PowerShell) corre el script,
// en segundo plano para no demorar a Claude. El script decide si el comando fue un `git commit`.
const entradaDelHook = () => ({
  matcher: "Bash|PowerShell",
  hooks: [{ type: "command", command: `node "${DESTINO.replace(/\\/g, "/")}"`, async: true, timeout: 60 }],
});

const guardarSettings = (settings) => {
  if (fs.existsSync(SETTINGS)) {
    const copia = `${SETTINGS}.antes-del-organizador`;
    if (!fs.existsSync(copia)) fs.copyFileSync(SETTINGS, copia);
  }
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  fs.writeFileSync(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);
};

const desinstalar = () => {
  const settings = leerJson(SETTINGS, {});
  const antes = settings.hooks?.PostToolUse ?? [];
  const despues = antes.filter((entrada) => !esDelOrganizador(entrada));
  if (despues.length === antes.length) {
    console.log("El hook no estaba instalado en", SETTINGS);
    return;
  }
  if (despues.length > 0) settings.hooks.PostToolUse = despues;
  else delete settings.hooks.PostToolUse;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  guardarSettings(settings);
  console.log(`Hook quitado de ${SETTINGS}.`);
  console.log(`La configuración y el log quedan en ${CARPETA}: borrá esa carpeta si no los querés.`);
};

// Pide la clave sin dejarla en el historial de la consola.
const pedirClave = async () => {
  const consola = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await consola.question("Clave de integración (INTEGRACION_API_KEY del back): ")).trim();
  } finally {
    consola.close();
  }
};

// Sin crear nada: un commit vacío con la clave correcta responde 400 (validación); con una incorrecta, 401.
const verificar = async (url, apiKey) => {
  try {
    const salud = await fetch(`${url}/salud`, { signal: AbortSignal.timeout(10000) });
    if (!salud.ok) return `El back respondió ${salud.status} en /salud.`;
    const prueba = await fetch(`${url}/integraciones/commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: "{}",
      signal: AbortSignal.timeout(10000),
    });
    if (prueba.status === 400) return null;
    if (prueba.status === 401) return "El back rechazó la clave: no coincide con su INTEGRACION_API_KEY.";
    if (prueba.status === 503) return "El back tiene la integración apagada: falta INTEGRACION_API_KEY en su .env.";
    if (prueba.status === 404) return "Ese back todavía no tiene la ruta /integraciones/commits: falta publicar la versión nueva.";
    return `El back respondió ${prueba.status} en /integraciones/commits.`;
  } catch (error) {
    return `No se pudo conectar con ${url} (${error.cause?.code ?? error.cause?.errors?.[0]?.code ?? error.name}).`;
  }
};

const instalar = async () => {
  const previa = leerJson(CONFIG, {});
  const url = (argumento("url") || previa.url || "").replace(/\/+$/, "");
  if (!/^https?:\/\/\S+$/.test(url)) {
    throw new Error("Falta la dirección del back: --url https://estadisticas.smt.gob.ar:5066");
  }
  const apiKey = process.env.ORGANIZADOR_API_KEY?.trim() || previa.apiKey || (await pedirClave());
  if (!apiKey) throw new Error("Falta la clave de integración.");
  const autor = argumento("autor") ?? previa.autor ?? "";

  fs.mkdirSync(CARPETA, { recursive: true });
  fs.copyFileSync(ORIGEN, DESTINO);
  fs.writeFileSync(CONFIG, `${JSON.stringify({ url, apiKey, autor }, null, 2)}\n`);
  console.log(`Hook copiado a ${DESTINO}`);

  const settings = leerJson(SETTINGS, {});
  settings.hooks ??= {};
  // Se reemplaza la entrada anterior del Organizador, si había, para que quede una sola y al día.
  settings.hooks.PostToolUse = [...(settings.hooks.PostToolUse ?? []).filter((entrada) => !esDelOrganizador(entrada)), entradaDelHook()];
  guardarSettings(settings);
  console.log(`Hook agregado a ${SETTINGS}`);

  const problema = await verificar(url, apiKey);
  if (problema) {
    console.log(`\nATENCIÓN: ${problema}`);
    console.log("El hook quedó instalado: los commits se guardan en cola y se envían cuando el back responda.");
  } else {
    console.log(`\nListo: ${url} responde y aceptó la clave.`);
  }
  console.log(autor ? `Los commits de esta máquina se le atribuyen a "${autor}".` : "Los commits se atribuyen según el nombre y el email de git de cada uno.");
  console.log("Claude Code toma el hook al iniciar una sesión nueva. El registro de lo enviado queda en:");
  console.log(`  ${path.join(CARPETA, "hook.log")}`);
};

try {
  if (tiene("desinstalar")) desinstalar();
  else await instalar();
} catch (error) {
  console.error(`No se pudo completar: ${error.message}`);
  process.exitCode = 1;
}
