import "./preparar.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Validador, esFechaValida, idDeRuta } from "../utils/validador.js";
import CustomError from "../utils/customError.js";

const { datosTareaNueva, datosActualizacion, datosMover, datosComentario, filtrosTarea } = await import("../validations/tareasValidation.js");
const { mencionadosEnTexto } = await import("../utils/menciones.js");
const { datosProyecto } = await import("../validations/proyectosValidation.js");
const { documentoDePersona, datosUsuario } = await import("../validations/usuariosValidation.js");

const erroresDe = (funcion) => {
  try {
    funcion();
  } catch (error) {
    assert.ok(error instanceof CustomError);
    assert.equal(error.code, 400);
    return error.errores;
  }
  assert.fail("Tenía que rechazar los datos");
};

test("texto: recorta espacios, exige los obligatorios y respeta el máximo", () => {
  const v = new Validador({ a: "  hola  ", b: "   ", c: "x".repeat(11) });
  assert.equal(v.texto("a"), "hola");
  assert.equal(v.texto("b"), null);
  assert.equal(v.texto("b", { requerido: true }), null);
  assert.equal(v.texto("c", { max: 10 }), null);
  assert.deepEqual(Object.keys(v.errores), ["b", "c"]);
});

test("entero: acepta números y textos numéricos, rechaza decimales y basura", () => {
  const v = new Validador({ a: "12", b: 7, c: "1.5", d: "1 OR 1=1", e: 0 });
  assert.equal(v.entero("a"), 12);
  assert.equal(v.entero("b"), 7);
  assert.equal(v.entero("c"), null);
  assert.equal(v.entero("d"), null);
  assert.equal(v.entero("e", { min: 0 }), 0);
  assert.deepEqual(Object.keys(v.errores), ["c", "d"]);
});

test("fecha: solo fechas reales en formato AAAA-MM-DD", () => {
  assert.equal(esFechaValida("2026-02-28"), true);
  assert.equal(esFechaValida("2026-02-30"), false);
  assert.equal(esFechaValida("28/02/2026"), false);
  const v = new Validador({ a: "2026-11-17T10:00:00.000Z" });
  assert.equal(v.fecha("a"), "2026-11-17");
});

test("idDeRuta rechaza ids que no son enteros positivos", () => {
  assert.equal(idDeRuta("15"), 15);
  assert.ok(erroresDe(() => idDeRuta("abc")).id);
  assert.ok(erroresDe(() => idDeRuta("0")).id);
});

test("tarea nueva: exige proyecto, título y prioridad; valida el orden de las fechas", () => {
  const errores = erroresDe(() => datosTareaNueva({ titulo: "ab", fecha_inicio: "2026-12-10", fecha_vencimiento: "2026-12-01" }));
  assert.deepEqual(Object.keys(errores).sort(), ["fecha_vencimiento", "id_prioridad", "id_proyecto", "titulo"]);

  const datos = datosTareaNueva({ id_proyecto: 3, titulo: " Relevar requisitos ", id_prioridad: "2" });
  assert.equal(datos.titulo, "Relevar requisitos");
  assert.equal(datos.id_prioridad, 2);
  assert.deepEqual(datos.ids_responsables, [], "sin responsables = sin asignar");
  assert.equal(datos.descripcion, null);
});

test("tarea: acepta varios responsables, sin repetidos, y rechaza una lista inválida", () => {
  const base = { id_proyecto: 1, titulo: "Tarea", id_prioridad: 2 };
  assert.deepEqual(datosTareaNueva({ ...base, ids_responsables: [4, "7", 4] }).ids_responsables, [4, 7]);
  assert.deepEqual(datosTareaNueva({ ...base, ids_responsables: [] }).ids_responsables, []);
  assert.ok(erroresDe(() => datosTareaNueva({ ...base, ids_responsables: "4,7" })).ids_responsables);
  assert.ok(erroresDe(() => datosTareaNueva({ ...base, ids_responsables: [4, -1] })).ids_responsables);
});

test("comentario: el texto es obligatorio y las menciones son una lista opcional de ids", () => {
  assert.deepEqual(datosComentario({ comentario: " Hola " }), { comentario: "Hola", ids_mencionados: [] });
  assert.deepEqual(datosComentario({ comentario: "Hola", ids_mencionados: [3, 3, 9] }).ids_mencionados, [3, 9]);
  assert.ok(erroresDe(() => datosComentario({ ids_mencionados: [3] })).comentario);
  assert.ok(erroresDe(() => datosComentario({ comentario: "Hola", ids_mencionados: ["x"] })).ids_mencionados);
});

test("menciones: solo cuentan los usuarios cuyo @Nombre figura en el texto", () => {
  const usuarios = [
    { id_usuario: 1, nombre_usuario: "Ana Prueba" },
    { id_usuario: 2, nombre_usuario: "Bruno Ejemplo" },
    { id_usuario: 3, nombre_usuario: "" },
    { id_usuario: 4, nombre_usuario: null },
  ];
  const ids = (texto) => mencionadosEnTexto(texto, usuarios).map((u) => u.id_usuario);
  assert.deepEqual(ids("Hola @Ana Prueba, ¿lo ves?"), [1]);
  assert.deepEqual(ids("@ana prueba y @BRUNO EJEMPLO"), [1, 2], "no distingue mayúsculas");
  assert.deepEqual(ids("Ana Prueba sin arroba"), [], "sin @ no es una mención");
  assert.deepEqual(ids("Hola @Ana"), [], "el nombre tiene que estar completo");
  assert.deepEqual(ids("Texto con @ suelto"), [], "un usuario sin nombre nunca coincide");
});

test("tarea nueva: prioridad, estado y porcentaje fuera de rango se rechazan", () => {
  const errores = erroresDe(() => datosTareaNueva({ id_proyecto: 1, titulo: "Tarea", id_prioridad: 9, id_etarea: 99, porcentaje_avance: 140 }));
  assert.deepEqual(Object.keys(errores).sort(), ["id_etarea", "id_prioridad", "porcentaje_avance"]);
});

test("actualización: una novedad o dificultad necesita comentario; un avance no", () => {
  assert.ok(erroresDe(() => datosActualizacion({ id_tactualizacion: 3 })).comentario);
  assert.equal(datosActualizacion({ id_tactualizacion: 1, porcentaje_avance: 40 }).porcentaje_avance, 40);
  // "Cambio de estado" (4) lo registra el tablero, no se puede mandar a mano.
  assert.ok(erroresDe(() => datosActualizacion({ id_tactualizacion: 4, id_etarea: 2 })).id_tactualizacion);
});

test("mover: exige un estado válido y una lista de ids sin duplicados", () => {
  assert.ok(erroresDe(() => datosMover({ ids_columna: [1, 2] })).id_etarea);
  assert.ok(erroresDe(() => datosMover({ id_etarea: 2, ids_columna: [1, "x"] })).ids_columna);
  assert.deepEqual(datosMover({ id_etarea: 2, ids_columna: [5, 3, 5] }).ids_columna, [5, 3]);
});

test("filtros de tareas: los valores libres salen de una lista cerrada", () => {
  assert.ok(erroresDe(() => filtrosTarea({ vencimiento: "todas" })).vencimiento);
  assert.ok(erroresDe(() => filtrosTarea({ ordenar: "titulo; DROP TABLE tarea" })).ordenar);
  assert.equal(filtrosTarea({ mias: "1", id_etarea: "2" }).mias, 1);
});

test("proyecto: la fecha de fin no puede ser anterior al inicio", () => {
  const errores = erroresDe(() =>
    datosProyecto({ nombre_proyecto: "Portal", id_eproyecto: 1, fecha_inicio: "2026-05-01", fecha_fin_estimada: "2026-04-01" }),
  );
  assert.deepEqual(Object.keys(errores), ["fecha_fin_estimada"]);
});

test("usuarios: el CUIL son 11 números y el rol sale del catálogo", () => {
  assert.equal(documentoDePersona({ documento: "20123456789" }), "20123456789");
  assert.ok(erroresDe(() => documentoDePersona({ documento: "20-12345678-9" })).documento);
  assert.ok(erroresDe(() => datosUsuario({ id_tusuario: 7, habilita: 1 })).id_tusuario);
});
