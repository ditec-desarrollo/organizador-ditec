import "./preparar.js";
import test from "node:test";
import assert from "node:assert/strict";
import { armarEmailDeMencion, esEmailValido } from "../utils/emailMencion.js";

const { enviarEmail, enviarEmailsDeMencion } = await import("../services/emailService.js");

const datos = {
  autor: "Ana Pérez",
  id_tarea: 42,
  titulo: "Migrar el servidor",
  proyecto: "Infraestructura",
  comentario: "@Juan Gómez ¿lo ves hoy?",
  urlFront: "https://ejemplo.gob.ar/organizador",
};

test("email de mención: asunto, texto y botón al Organizador", () => {
  const { asunto, texto, html } = armarEmailDeMencion(datos);
  assert.equal(asunto, 'Ana Pérez te mencionó en la tarea "Migrar el servidor"');
  assert.match(texto, /proyecto "Infraestructura"/);
  assert.match(texto, /@Juan Gómez ¿lo ves hoy\?/);
  // El enlace abre la tarea directamente en la solapa Comentarios (en el HTML, el & va escapado).
  assert.match(texto, /https:\/\/ejemplo\.gob\.ar\/organizador\/#\/home\?tarea=42&solapa=comentarios(\s|$)/);
  assert.match(html, /href="https:\/\/ejemplo\.gob\.ar\/organizador\/#\/home\?tarea=42&amp;solapa=comentarios"/);
});

test("email de mención: escapa el HTML del comentario y del título", () => {
  const { html } = armarEmailDeMencion({ ...datos, titulo: "<b>x</b>", comentario: '<script>alert("1")</script> & listo' });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<b>x</b>"));
  assert.match(html, /&lt;script&gt;alert\(&quot;1&quot;\)&lt;\/script&gt; &amp; listo/);
});

test("email de mención: asunto en una sola línea y acotado; sin URL del front no lleva enlace", () => {
  const { asunto, texto, html } = armarEmailDeMencion({ ...datos, autor: "", titulo: `Línea 1\r\nBcc: otro@x.com ${"x".repeat(300)}`, urlFront: "" });
  assert.ok(!/[\r\n]/.test(asunto));
  assert.ok(asunto.length <= 150);
  assert.match(asunto, /^Alguien te mencionó/);
  assert.ok(!html.includes("<a "));
  assert.match(texto, /Ciudad Digital/);
});

test("esEmailValido: descarta vacíos, nulos y direcciones mal formadas", () => {
  assert.equal(esEmailValido("persona@smt.gob.ar"), true);
  for (const malo of [null, undefined, "", "sin-arroba", "a@b", "a b@c.com", "a@c.com, otro@c.com"]) {
    assert.equal(esEmailValido(malo), false, String(malo));
  }
});

test("con EMAIL_ACTIVO apagado no se envía nada ni se consulta la base", async () => {
  assert.equal(await enviarEmail({ para: "persona@smt.gob.ar", asunto: "x", texto: "x", html: "x" }), false);
  assert.equal(await enviarEmailsDeMencion({ id_usuario_origen: 1, ids_mencionados: [2, 3], id_tarea: 1, titulo: "t", proyecto: "p", comentario: "c" }), 0);
});
