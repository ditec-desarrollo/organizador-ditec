// Cómo se interpreta un commit: repositorio, autor, título, descripción y referencias a tareas.
import test from "node:test";
import assert from "node:assert/strict";
import {
  cuerpoDeCommit,
  descripcionDeCommit,
  esMerge,
  fechaHoraLocal,
  finalizaTarea,
  novedadDeCommit,
  tareaReferida,
  tituloDeCommit,
} from "../utils/commits.js";
import { normalizarAlias, normalizarRepositorio } from "../utils/repositorio.js";

const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

test("el mismo repositorio se escribe igual venga como venga", () => {
  const esperado = "github.com/ditec-desarrollo/gaf-backend";
  for (const url of [
    "https://github.com/ditec-desarrollo/gaf-backend.git",
    "https://github.com/ditec-desarrollo/GAF-Backend",
    "http://github.com/ditec-desarrollo/gaf-backend/",
    "git@github.com:ditec-desarrollo/gaf-backend.git",
    "ssh://git@github.com/ditec-desarrollo/gaf-backend.git",
    "  github.com/ditec-desarrollo/gaf-backend.git/  ",
  ]) {
    assert.equal(normalizarRepositorio(url), esperado, url);
  }
});

test("las credenciales de la URL del remoto no se guardan", () => {
  assert.equal(
    normalizarRepositorio("https://usuario:ghp_secreto123@github.com/ditec-desarrollo/login.git"),
    "github.com/ditec-desarrollo/login",
  );
  assert.equal(normalizarRepositorio("https://token@github.com/ditec-desarrollo/login"), "github.com/ditec-desarrollo/login");
});

test("un repo sin remoto se identifica por el nombre de su carpeta", () => {
  assert.equal(normalizarRepositorio("Derivador"), "derivador");
  assert.equal(normalizarRepositorio("GAF-Ditec"), "gaf-ditec");
  assert.equal(normalizarRepositorio(""), "");
  assert.equal(normalizarRepositorio(null), "");
});

test("los alias de git se comparan sin mayúsculas ni espacios de más", () => {
  assert.equal(normalizarAlias("  Pedro   Aráoz "), "pedro aráoz");
  assert.equal(normalizarAlias("Alguien@Gmail.com"), "alguien@gmail.com");
  assert.equal(normalizarAlias(undefined), "");
});

test("los merges se reconocen por el mensaje", () => {
  assert.equal(esMerge("Merge pull request #149 from ditec-desarrollo/damian"), true);
  assert.equal(esMerge("Merge branch 'dev' into main"), true);
  assert.equal(esMerge("Merge remote-tracking branch 'origin/main'"), true);
  assert.equal(esMerge("merge de los reportes de tesorería"), false);
  assert.equal(esMerge("arreglos en roles y permisos de usuario"), false);
});

test("solo 'tarea #N' refiere a una tarea: '#N' solo es de GitHub", () => {
  assert.equal(tareaReferida("avance en el login (tarea #12)"), 12);
  assert.equal(tareaReferida("Tarea #7: validaciones del formulario"), 7);
  assert.equal(tareaReferida("cierra tarea#30"), 30);
  assert.equal(tareaReferida("fix #12"), null);
  assert.equal(tareaReferida("Merge pull request #149"), null);
  assert.equal(tareaReferida("tarea 12 lista"), null);
});

test("un verbo de cierre pegado a la referencia finaliza la tarea", () => {
  for (const mensaje of [
    "Notificaciones: abrir la tarea en comentarios (finaliza tarea #77)",
    "Finaliza la tarea #77",
    "cierra tarea #77",
    "Cerré la tarea #77 con este cambio",
    "terminé tarea#77",
    "completa la tarea # 77",
    "tarea #77 finalizada",
    "Tarea #77 cerrada: validaciones del formulario",
    "listo el login, tarea #77 terminada",
    "tarea #77 completada",
  ]) {
    assert.equal(finalizaTarea(mensaje, 77), true, mensaje);
  }
});

test("sin verbo de cierre, o si el cierre es de otra tarea, la tarea sigue abierta", () => {
  for (const mensaje of [
    "avance en el login (tarea #77)",
    "tarea #77: validaciones del formulario",
    "determina el estado de la tarea #77",
    "finaliza el refactor, sigue la tarea #77",
    "tarea #77 lista para revisar",
    "tarea #77 terminadas las validaciones",
    "finaliza tarea #770",
    "finaliza tarea #7",
    "cierra #77",
    "",
  ]) {
    assert.equal(finalizaTarea(mensaje, 77), false, mensaje);
  }
});

test("el título es la primera línea, y un mensaje muy corto se completa con el hash", () => {
  assert.equal(tituloDeCommit("envio de email listo\n\ndetalle", SHA), "envio de email listo");
  assert.equal(tituloDeCommit("ok", SHA), "Commit a1b2c3d: ok");
  assert.equal(tituloDeCommit("", SHA), "Commit a1b2c3d");
  const largo = tituloDeCommit("x".repeat(300), SHA);
  assert.equal(largo.length, 200);
  assert.ok(largo.endsWith("…"));
});

test("la descripción lleva el cuerpo sin las firmas automáticas y el origen del commit", () => {
  const mensaje = [
    "Tablero: ocultar finalizadas viejas",
    "",
    "Las finalizadas hace más de una semana pasan al Historial.",
    "",
    "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>",
  ].join("\n");
  assert.equal(cuerpoDeCommit(mensaje), "Las finalizadas hace más de una semana pasan al Historial.");

  const commit = { commit_sha: SHA, repositorio: "github.com/ditec-desarrollo/organizador-ditec", rama: "dev", mensaje };
  assert.equal(
    descripcionDeCommit(commit),
    "Las finalizadas hace más de una semana pasan al Historial.\n\nCommit a1b2c3d · github.com/ditec-desarrollo/organizador-ditec · rama dev",
  );
  assert.equal(descripcionDeCommit({ ...commit, mensaje: "pull", rama: null }), "Commit a1b2c3d · github.com/ditec-desarrollo/organizador-ditec");
  assert.equal(
    novedadDeCommit({ ...commit, mensaje: "validaciones (tarea #7)" }),
    "validaciones (tarea #7)\n\nCommit a1b2c3d · github.com/ditec-desarrollo/organizador-ditec · rama dev",
  );
});

test("un cuerpo enorme se corta para que la descripción entre en la tarea", () => {
  const commit = { commit_sha: SHA, repositorio: "derivador", rama: "main", mensaje: `titulo\n\n${"a".repeat(9000)}` };
  const descripcion = descripcionDeCommit(commit);
  assert.ok(descripcion.length <= 5000);
  assert.ok(descripcion.endsWith("Commit a1b2c3d · derivador · rama main"));
});

test("la fecha del commit se guarda con la hora local de quien lo hizo", () => {
  assert.equal(fechaHoraLocal("2026-11-24T10:15:30-03:00"), "2026-11-24 10:15:30");
  assert.equal(fechaHoraLocal(null), null);
});
