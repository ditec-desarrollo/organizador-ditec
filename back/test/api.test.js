// Pruebas del armado de la API que no necesitan base de datos:
// autenticación, CORS, cabeceras, JSON inválido y rutas inexistentes.
import "./preparar.js";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

const { default: app } = await import("../app.js");
const { cerrarPool } = await import("../config/dbOrganizador.js");

let servidor;
let base;

before(async () => {
  await new Promise((resolve) => {
    servidor = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
  await cerrarPool();
});

const tokenValido = () => jwt.sign({ id: 123 }, process.env.JWT_SECRET_KEY, { expiresIn: "5m" });

test("/salud responde sin token", async () => {
  const respuesta = await fetch(`${base}/salud`);
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { ok: true });
});

test("sin token, cualquier ruta privada responde 401 Invalid token", async () => {
  for (const ruta of ["/proyectos", "/tareas", "/dashboard", "/notificaciones", "/usuarios/authStatus", "/catalogos"]) {
    const respuesta = await fetch(`${base}${ruta}`);
    assert.equal(respuesta.status, 401, ruta);
    assert.deepEqual(await respuesta.json(), { message: "Invalid token" });
  }
});

test("un token firmado con otra clave o vencido se rechaza", async () => {
  const ajeno = jwt.sign({ id: 123 }, "otra-clave");
  const vencido = jwt.sign({ id: 123 }, process.env.JWT_SECRET_KEY, { expiresIn: -10 });
  const sinId = jwt.sign({ nombre: "x" }, process.env.JWT_SECRET_KEY);
  for (const token of [ajeno, vencido, sinId, "cualquier-cosa"]) {
    const respuesta = await fetch(`${base}/proyectos`, { headers: { Authorization: token } });
    assert.equal(respuesta.status, 401);
  }
});

test("el token se acepta solo o con el prefijo Bearer", async () => {
  // Ruta inexistente: si pasa la autenticación llega al 404; si no, se queda en el 401.
  for (const cabecera of [tokenValido(), `Bearer ${tokenValido()}`]) {
    const respuesta = await fetch(`${base}/no-existe`, { headers: { Authorization: cabecera } });
    assert.equal(respuesta.status, 404);
    assert.deepEqual(await respuesta.json(), { message: "La ruta no existe" });
  }
});

test("un body que no es JSON válido responde 400", async () => {
  const respuesta = await fetch(`${base}/proyectos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: tokenValido() },
    body: "{ esto no es json",
  });
  assert.equal(respuesta.status, 400);
});

test("si la base no responde, la API contesta 503 sin filtrar el detalle", async () => {
  const respuesta = await fetch(`${base}/proyectos`, { headers: { Authorization: tokenValido() } });
  assert.equal(respuesta.status, 503);
  assert.deepEqual(await respuesta.json(), { message: "No se pudo conectar con la base de datos" });
});

// ───────────── Integración con git: POST /integraciones/commits ─────────────

const commitValido = {
  commit_sha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
  repositorio: "https://github.com/ditec-desarrollo/organizador-ditec.git",
  carpeta: "organizador-ditec",
  rama: "dev",
  autor_nombre: "ditec-desarrollo",
  autor_email: "alguien@smt.gob.ar",
  mensaje: "envio de email listo",
  fecha: "2026-11-24T10:15:30-03:00",
};

const enviarCommit = (cuerpo, clave) =>
  fetch(`${base}/integraciones/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(clave === undefined ? {} : { "X-Api-Key": clave }) },
    body: JSON.stringify(cuerpo),
  });

test("la entrada de commits exige la clave de integración, no el token", async () => {
  for (const clave of [undefined, "", "otra-clave", tokenValido()]) {
    const respuesta = await enviarCommit(commitValido, clave);
    assert.equal(respuesta.status, 401);
    assert.deepEqual(await respuesta.json(), { message: "Clave de integración inválida" });
  }
  // El token de Ciudad Digital no reemplaza a la clave.
  const conToken = await fetch(`${base}/integraciones/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: tokenValido() },
    body: JSON.stringify(commitValido),
  });
  assert.equal(conToken.status, 401);
});

test("con la clave, un commit mal armado responde 400 con el error de cada campo", async () => {
  const respuesta = await enviarCommit({ ...commitValido, commit_sha: "a1b2c3d", mensaje: "", fecha: "ayer" }, process.env.INTEGRACION_API_KEY);
  assert.equal(respuesta.status, 400);
  const { errores } = await respuesta.json();
  assert.deepEqual(Object.keys(errores).sort(), ["commit_sha", "fecha", "mensaje"]);
});

test("con la clave y un commit válido, el pedido llega hasta la base", async () => {
  // En estas pruebas la base no existe: llegar al 503 confirma que pasó la clave y la validación.
  const respuesta = await enviarCommit(commitValido, process.env.INTEGRACION_API_KEY);
  assert.equal(respuesta.status, 503);
});

test("consultar y reprocesar commits sí exige el token de Ciudad Digital", async () => {
  const consulta = await fetch(`${base}/integraciones/commits`, { headers: { "X-Api-Key": process.env.INTEGRACION_API_KEY } });
  assert.equal(consulta.status, 401);
  assert.deepEqual(await consulta.json(), { message: "Invalid token" });

  const reproceso = await fetch(`${base}/integraciones/commits/reprocesar`, { method: "POST", headers: { "X-Api-Key": process.env.INTEGRACION_API_KEY } });
  assert.equal(reproceso.status, 401);
});

test("CORS: solo se habilita el origen configurado", async () => {
  const permitido = await fetch(`${base}/salud`, { headers: { Origin: "http://localhost:5173" } });
  assert.equal(permitido.headers.get("access-control-allow-origin"), "http://localhost:5173");

  const ajeno = await fetch(`${base}/salud`, { headers: { Origin: "https://sitio-ajeno.com" } });
  assert.equal(ajeno.headers.get("access-control-allow-origin"), null);
});

test("helmet agrega las cabeceras de seguridad y oculta x-powered-by", async () => {
  const respuesta = await fetch(`${base}/salud`);
  assert.equal(respuesta.headers.get("x-content-type-options"), "nosniff");
  assert.equal(respuesta.headers.get("x-powered-by"), null);
});
