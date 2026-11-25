// Prueba de integración contra la base real (la de back/.env). Recorre el flujo completo:
// usuarios, proyectos, integrantes y responsables, tareas con varios responsables, permisos por rol,
// seguimiento e historial, tablero (mover y reordenar), comentarios y menciones, notificaciones,
// panel, la API por HTTP y la integración con git (commits que generan tareas).
//
//   npm run test:integracion
//
// Es para la base de DESARROLLO. Para no mezclarse con datos reales:
//   · solo corre si no hay usuarios, proyectos ni tareas cargados;
//   · usa tres usuarios de prueba con id_persona negativo (no existen en Ciudad Digital);
//   · al terminar borra todo lo que creó y deja los contadores de id como estaban.
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { env } from "../config/env.js";
import { cerrarPool, consultar, obtenerPool } from "../config/dbOrganizador.js";
import * as usuariosRepository from "../repositories/usuariosRepository.js";
import * as actividadRepository from "../repositories/actividadRepository.js";
import * as notificacionesRepository from "../repositories/notificacionesRepository.js";
import * as proyectosRepository from "../repositories/proyectosRepository.js";
import * as tareasRepository from "../repositories/tareasRepository.js";
import * as proyectosService from "../services/proyectosService.js";
import * as tareasService from "../services/tareasService.js";
import * as usuariosService from "../services/usuariosService.js";
import * as notificacionesService from "../services/notificacionesService.js";
import * as dashboardService from "../services/dashboardService.js";
import * as integracionesService from "../services/integracionesService.js";
import { ESTADOS_PROYECTO, ESTADOS_TAREA, PRIORIDADES, RESULTADOS_COMMIT, ROLES, TIPOS_ACTUALIZACION, TIPOS_NOTIFICACION } from "../utils/constantes.js";

// Tablas que la prueba ensucia, en el orden en que hay que vaciarlas (hijas antes que padres).
const TABLAS = [
  "commit_recibido",
  "usuario_alias_git",
  "proyecto_repositorio",
  "registro_actividad",
  "notificacion",
  "tarea_comentario_mencion",
  "tarea_comentario",
  "tarea_actualizacion",
  "tarea_responsable",
  "tarea",
  "proyecto_integrante",
  "proyecto",
  "usuario",
];

// "Hoy" es el del servidor de base de datos (el que usan las consultas), no el de esta máquina.
let hoy;
const hoyMas = (dias) => new Date(Date.parse(`${hoy}T00:00:00Z`) + dias * 864e5).toISOString().slice(0, 10);

let pasos = 0;
const paso = async (nombre, funcion) => {
  await funcion();
  pasos += 1;
  console.log(`  ✔ ${nombre}`);
};

// Verifica que la promesa falle con ese código HTTP.
const falla = async (codigo, promesa) => {
  try {
    await promesa;
  } catch (error) {
    assert.equal(error.code, codigo, `Esperaba ${codigo} y falló con ${error.code}: ${error.message}`);
    return error;
  }
  assert.fail(`Esperaba un error ${codigo} y no falló`);
};

const limpiar = async () => {
  const connection = await obtenerPool().getConnection();
  try {
    // usuario se referencia a sí misma (id_usuario_alta): se desactiva el control solo durante el borrado.
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const tabla of TABLAS) {
      await connection.query(`DELETE FROM ${tabla}`);
      // Vuelve el contador de ids a 1. Si el usuario de la base no tiene permiso de ALTER, se omite.
      await connection.query(`ALTER TABLE ${tabla} AUTO_INCREMENT = 1`).catch(() => {});
    }
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    connection.release();
  }
};

const exigirBaseVacia = async () => {
  for (const tabla of ["usuario", "proyecto", "tarea"]) {
    const [{ total }] = await consultar(`SELECT COUNT(*) AS total FROM ${tabla}`);
    if (total > 0) {
      throw new Error(`La tabla ${tabla} ya tiene datos (${total}). Esta prueba solo corre sobre una base sin usuarios, proyectos ni tareas.`);
    }
  }
};

const probarServicios = async () => {
  // ───────────── Usuarios ─────────────
  const crearUsuario = async (id_persona, id_tusuario) => {
    await usuariosRepository.crear({ id_persona, id_tusuario, id_usuario_alta: null });
    return usuariosRepository.buscarPorPersona(id_persona);
  };
  let admin, supervisor, colaborador, ajeno;

  await paso("alta de usuarios de prueba y lectura con el JOIN a Ciudad Digital", async () => {
    admin = await crearUsuario(-1, ROLES.ADMINISTRADOR);
    supervisor = await crearUsuario(-2, ROLES.SUPERVISOR);
    colaborador = await crearUsuario(-3, ROLES.COLABORADOR);
    ajeno = await crearUsuario(-4, ROLES.COLABORADOR);
    assert.equal(admin.nombre_tusuario, "ADMINISTRADOR");
    const lista = await usuariosService.listar({ solo_habilitados: 1 });
    assert.equal(lista.length, 4);
    assert.ok("nombre_persona" in lista[0], "falta el dato de persona en la lista");
  });

  await paso("no se puede dejar el sistema sin administradores", async () => {
    await falla(409, usuariosService.actualizar(admin, admin.id_usuario, { id_tusuario: ROLES.COLABORADOR, habilita: 1 }));
    await falla(409, usuariosService.actualizar(admin, admin.id_usuario, { id_tusuario: ROLES.ADMINISTRADOR, habilita: 0 }));
    const editado = await usuariosService.actualizar(admin, ajeno.id_usuario, { id_tusuario: ROLES.COLABORADOR, habilita: 1 });
    assert.equal(editado.habilita, 1);
  });

  await paso("una persona que no existe en Ciudad Digital no tiene sesión ni se puede dar de alta", async () => {
    assert.equal(await usuariosService.estadoDeSesion(-999), null);
    await falla(404, usuariosService.crear(admin, { id_persona: -999, id_tusuario: ROLES.COLABORADOR }));
    await falla(404, usuariosService.buscarPersona("00000000000"));
  });

  // ───────────── Proyectos ─────────────
  let proyecto;
  const datosProyecto = { nombre_proyecto: "Proyecto de prueba", descripcion: "Creado por la prueba de integración", fecha_inicio: hoyMas(-5), fecha_fin_estimada: hoyMas(30), id_eproyecto: ESTADOS_PROYECTO.ACTIVO };

  await paso("el supervisor crea un proyecto y queda como integrante", async () => {
    proyecto = await proyectosService.crear(supervisor, datosProyecto);
    assert.equal(proyecto.nombre_proyecto, "Proyecto de prueba");
    assert.equal(proyecto.fecha_inicio, datosProyecto.fecha_inicio, "la fecha se corrió");
    assert.equal(proyecto.puede_gestionar, true);
    assert.deepEqual(proyecto.integrantes.map((i) => i.id_usuario), [supervisor.id_usuario]);
    assert.equal(proyecto.integrantes[0].es_responsable, 1, "quien crea el proyecto queda como responsable");
    assert.ok("nombres_responsables" in proyecto);
  });

  await paso("visibilidad: el admin ve todo, el colaborador solo donde es integrante", async () => {
    assert.equal((await proyectosService.listar(admin, {})).length, 1);
    assert.equal((await proyectosService.listar(supervisor, {})).length, 1);
    assert.equal((await proyectosService.listar(colaborador, {})).length, 0);
    await falla(403, proyectosService.obtener(colaborador, proyecto.id_proyecto));
    await falla(404, proyectosService.obtener(admin, 999999));
  });

  await paso("integrantes: alta, duplicado y permisos", async () => {
    await falla(403, proyectosService.agregarIntegrante(colaborador, proyecto.id_proyecto, colaborador.id_usuario));
    const integrantes = await proyectosService.agregarIntegrante(supervisor, proyecto.id_proyecto, colaborador.id_usuario);
    assert.equal(integrantes.length, 2);
    await falla(409, proyectosService.agregarIntegrante(supervisor, proyecto.id_proyecto, colaborador.id_usuario));
    await falla(404, proyectosService.agregarIntegrante(supervisor, proyecto.id_proyecto, 999999));
    const visto = await proyectosService.obtener(colaborador, proyecto.id_proyecto);
    assert.equal(visto.puede_gestionar, false);
    await falla(403, proyectosService.actualizar(colaborador, proyecto.id_proyecto, datosProyecto));
    const editado = await proyectosService.actualizar(supervisor, proyecto.id_proyecto, { ...datosProyecto, nombre_proyecto: "Proyecto editado" });
    assert.equal(editado.nombre_proyecto, "Proyecto editado");
    assert.equal((await proyectosService.listar(admin, { buscar: "editado" })).length, 1);
    assert.equal((await proyectosService.listar(admin, { buscar: "no-existe" })).length, 0);
  });

  // ───────────── Tareas ─────────────
  let tareaA, tareaB, tareaC;
  const datosTarea = (titulo, extra = {}) => ({
    id_proyecto: proyecto.id_proyecto,
    titulo,
    descripcion: null,
    ids_responsables: [colaborador.id_usuario],
    id_prioridad: PRIORIDADES.MEDIA,
    id_etarea: null,
    porcentaje_avance: null,
    fecha_inicio: null,
    fecha_vencimiento: hoyMas(1),
    ...extra,
  });

  await paso("alta de tareas: permisos, responsable integrante y notificación de asignación", async () => {
    await falla(403, tareasService.crear(colaborador, datosTarea("No debería crearse")));
    await falla(400, tareasService.crear(supervisor, datosTarea("Responsable ajeno", { ids_responsables: [ajeno.id_usuario] })));
    tareaA = await tareasService.crear(supervisor, datosTarea("Tarea A"));
    tareaB = await tareasService.crear(supervisor, datosTarea("Tarea B", { fecha_vencimiento: hoyMas(-2), id_prioridad: PRIORIDADES.URGENTE }));
    tareaC = await tareasService.crear(supervisor, datosTarea("Tarea C", { ids_responsables: [], fecha_vencimiento: null }));
    assert.equal(tareaA.id_etarea, ESTADOS_TAREA.PENDIENTE);
    assert.deepEqual(tareaA.responsables.map((r) => r.id_usuario), [colaborador.id_usuario]);
    assert.deepEqual(tareaC.responsables, []);
    assert.equal(tareaA.porcentaje_avance, 0);
    assert.equal(tareaA.fecha_vencimiento, hoyMas(1));
    assert.equal(tareaA.dias_para_vencer, 1);
    assert.equal(tareaB.vencida, 1);
    assert.ok(tareaA.orden < tareaB.orden && tareaB.orden < tareaC.orden);
    const avisos = await notificacionesRepository.listar(colaborador.id_usuario);
    assert.equal(avisos.filter((n) => n.id_tnotificacion === TIPOS_NOTIFICACION.TAREA_ASIGNADA).length, 2);
    assert.equal((await notificacionesRepository.listar(supervisor.id_usuario)).length, 0, "no se notifica a quien hizo la acción");
  });

  await paso("filtros y búsqueda de tareas", async () => {
    const listar = (usuario, filtros = {}) => tareasService.listar(usuario, filtros);
    assert.equal((await listar(admin)).length, 3);
    assert.equal((await listar(ajeno)).length, 0);
    assert.equal((await listar(colaborador, { mias: 1 })).length, 2);
    assert.equal((await listar(admin, { sin_responsable: 1 })).length, 1);
    assert.equal((await listar(admin, { id_prioridad: PRIORIDADES.URGENTE })).length, 1);
    assert.equal((await listar(admin, { vencimiento: "vencidas" })).length, 1);
    assert.equal((await listar(admin, { vencimiento: "proximas" })).length, 1);
    assert.equal((await listar(admin, { buscar: "tarea b" })).length, 1);
    assert.equal((await listar(admin, { buscar: "editado" })).length, 3, "busca también por nombre de proyecto");
    assert.equal((await listar(admin, { vence_desde: hoyMas(0), vence_hasta: hoyMas(5) })).length, 1);
    assert.equal((await listar(admin, { id_etarea: ESTADOS_TAREA.FINALIZADA })).length, 0);
    const porVencimiento = await listar(admin, { ordenar: "vencimiento" });
    assert.deepEqual(porVencimiento.map((t) => t.titulo), ["Tarea B", "Tarea A", "Tarea C"]);
    assert.equal((await listar(admin, { limite: 2 })).length, 2);
  });

  // ───────────── Seguimiento ─────────────
  await paso("el responsable registra avance y cambio de estado; queda en el historial", async () => {
    const actualizada = await tareasService.registrarActualizacion(colaborador, tareaA.id_tarea, {
      id_tactualizacion: TIPOS_ACTUALIZACION.AVANCE,
      id_etarea: ESTADOS_TAREA.EN_PROGRESO,
      porcentaje_avance: 40,
      comentario: "Arranqué con el relevamiento",
    });
    assert.equal(actualizada.id_etarea, ESTADOS_TAREA.EN_PROGRESO);
    assert.equal(actualizada.porcentaje_avance, 40);
    const [ultima] = await tareasService.listarActualizaciones(colaborador, tareaA.id_tarea);
    assert.equal(ultima.id_etarea_anterior, ESTADOS_TAREA.PENDIENTE);
    assert.equal(ultima.id_etarea_nuevo, ESTADOS_TAREA.EN_PROGRESO);
    assert.equal(ultima.porcentaje_anterior, 0);
    assert.equal(ultima.porcentaje_nuevo, 40);
    assert.equal(ultima.comentario, "Arranqué con el relevamiento");
    assert.equal(ultima.id_usuario, colaborador.id_usuario);
    const avisos = await notificacionesRepository.listar(supervisor.id_usuario);
    assert.equal(avisos[0].id_tnotificacion, TIPOS_NOTIFICACION.AVANCE_REGISTRADO, "se le avisa a quien creó la tarea");
  });

  await paso("una dificultad sin cambios de estado guarda solo el comentario", async () => {
    await tareasService.registrarActualizacion(colaborador, tareaA.id_tarea, {
      id_tactualizacion: TIPOS_ACTUALIZACION.DIFICULTAD,
      id_etarea: null,
      porcentaje_avance: null,
      comentario: "Falta el acceso al servidor",
    });
    const historial = await tareasService.listarActualizaciones(colaborador, tareaA.id_tarea);
    assert.equal(historial.length, 2, "el historial acumula, no pisa");
    assert.equal(historial[0].id_etarea_nuevo, null);
    assert.equal(historial[0].porcentaje_nuevo, null);
    await falla(400, tareasService.registrarActualizacion(colaborador, tareaA.id_tarea, { id_tactualizacion: TIPOS_ACTUALIZACION.AVANCE, id_etarea: null, porcentaje_avance: null, comentario: null }));
  });

  await paso("solo el responsable o quien gestiona puede actualizar", async () => {
    const datos = { id_tactualizacion: TIPOS_ACTUALIZACION.AVANCE, id_etarea: null, porcentaje_avance: 10, comentario: null };
    await falla(403, tareasService.registrarActualizacion(colaborador, tareaC.id_tarea, datos));
    await falla(403, tareasService.registrarActualizacion(ajeno, tareaA.id_tarea, datos));
    await falla(403, tareasService.mover(colaborador, tareaC.id_tarea, { id_etarea: ESTADOS_TAREA.EN_PROGRESO, ids_columna: null }));
    await falla(403, tareasService.actualizar(colaborador, tareaA.id_tarea, datosTarea("Hackeada")));
    const vista = await tareasService.obtener(colaborador, tareaC.id_tarea);
    assert.equal(vista.puede_actualizar, false);
    assert.equal((await tareasService.obtener(colaborador, tareaA.id_tarea)).puede_actualizar, true);
  });

  // ───────────── Tablero ─────────────
  await paso("mover en el tablero: cambia el estado, lo registra y reordena la columna", async () => {
    // B pasa a "En progreso" y queda arriba de A.
    const movida = await tareasService.mover(colaborador, tareaB.id_tarea, { id_etarea: ESTADOS_TAREA.EN_PROGRESO, ids_columna: [tareaB.id_tarea, tareaA.id_tarea] });
    assert.equal(movida.id_etarea, ESTADOS_TAREA.EN_PROGRESO);
    const columna = (await tareasService.listar(admin, { id_etarea: ESTADOS_TAREA.EN_PROGRESO })).map((t) => t.titulo);
    assert.deepEqual(columna, ["Tarea B", "Tarea A"]);
    const [ultima] = await tareasService.listarActualizaciones(admin, tareaB.id_tarea);
    assert.equal(ultima.id_tactualizacion, TIPOS_ACTUALIZACION.CAMBIO_ESTADO);
    // Reordenar dentro de la misma columna no agrega historial.
    await tareasService.mover(colaborador, tareaA.id_tarea, { id_etarea: ESTADOS_TAREA.EN_PROGRESO, ids_columna: [tareaA.id_tarea, tareaB.id_tarea] });
    assert.deepEqual((await tareasService.listar(admin, { id_etarea: ESTADOS_TAREA.EN_PROGRESO })).map((t) => t.titulo), ["Tarea A", "Tarea B"]);
    assert.equal((await tareasService.listarActualizaciones(admin, tareaA.id_tarea)).length, 2);
    // Una columna que no coincide con la base se rechaza.
    await falla(409, tareasService.mover(supervisor, tareaA.id_tarea, { id_etarea: ESTADOS_TAREA.EN_PROGRESO, ids_columna: [tareaA.id_tarea, tareaC.id_tarea] }));
    await falla(400, tareasService.mover(supervisor, tareaA.id_tarea, { id_etarea: ESTADOS_TAREA.EN_PROGRESO, ids_columna: [tareaB.id_tarea] }));
  });

  await paso("finalizar deja 100 % y fecha de finalización; reabrir la limpia", async () => {
    const finalizada = await tareasService.mover(colaborador, tareaB.id_tarea, { id_etarea: ESTADOS_TAREA.FINALIZADA, ids_columna: [tareaB.id_tarea] });
    assert.equal(finalizada.porcentaje_avance, 100);
    assert.ok(finalizada.fecha_finalizacion);
    assert.equal(finalizada.vencida, 0, "una tarea finalizada no cuenta como vencida");
    const reabierta = await tareasService.mover(supervisor, tareaB.id_tarea, { id_etarea: ESTADOS_TAREA.EN_REVISION, ids_columna: null });
    assert.equal(reabierta.fecha_finalizacion, null);
    assert.equal(reabierta.vencida, 1);
  });

  // ───────────── Edición, reasignación y comentarios ─────────────
  await paso("editar y reasignar: notifica al responsable nuevo y al anterior", async () => {
    await proyectosService.agregarIntegrante(admin, proyecto.id_proyecto, ajeno.id_usuario);
    const editada = await tareasService.actualizar(supervisor, tareaA.id_tarea, datosTarea("Tarea A editada", { ids_responsables: [ajeno.id_usuario], fecha_vencimiento: hoyMas(10) }));
    assert.equal(editada.titulo, "Tarea A editada");
    assert.deepEqual(editada.responsables.map((r) => r.id_usuario), [ajeno.id_usuario]);
    assert.equal(editada.id_etarea, ESTADOS_TAREA.EN_PROGRESO, "editar no toca el estado");
    assert.equal((await notificacionesRepository.listar(ajeno.id_usuario))[0].id_tnotificacion, TIPOS_NOTIFICACION.TAREA_ASIGNADA);
    assert.equal((await notificacionesRepository.listar(colaborador.id_usuario))[0].id_tnotificacion, TIPOS_NOTIFICACION.TAREA_MODIFICADA);
    // Solo cambia la fecha: aviso de cambio de vencimiento.
    await tareasService.actualizar(supervisor, tareaA.id_tarea, datosTarea("Tarea A editada", { ids_responsables: [ajeno.id_usuario], fecha_vencimiento: hoyMas(12) }));
    assert.equal((await notificacionesRepository.listar(ajeno.id_usuario))[0].id_tnotificacion, TIPOS_NOTIFICACION.CAMBIO_VENCIMIENTO);
  });

  await paso("comentarios: alta, notificación y borrado solo por el autor o un admin", async () => {
    const comentarios = await tareasService.agregarComentario(colaborador, tareaA.id_tarea, { comentario: "¿Sigo con esto o espero?", ids_mencionados: [] });
    assert.equal(comentarios.length, 1);
    assert.deepEqual(comentarios[0].menciones, []);
    assert.equal((await notificacionesRepository.listar(ajeno.id_usuario))[0].id_tnotificacion, TIPOS_NOTIFICACION.COMENTARIO);
    const id = comentarios[0].id_tarea_comentario;
    await falla(403, tareasService.eliminarComentario(ajeno, tareaA.id_tarea, id));
    await falla(404, tareasService.eliminarComentario(colaborador, tareaB.id_tarea, id));
    assert.equal((await tareasService.eliminarComentario(colaborador, tareaA.id_tarea, id)).length, 0);
  });

  await paso("menciones: una mención que no figura en el texto se descarta; las guardadas vuelven con el comentario", async () => {
    // Un usuario que todavía no es integrante del proyecto.
    const externo = await crearUsuario(-5, ROLES.COLABORADOR);
    const antes = (await notificacionesRepository.listar(externo.id_usuario)).length;
    // Se manda su id pero su nombre no aparece en el texto: no es una mención.
    const comentarios = await tareasService.agregarComentario(colaborador, tareaA.id_tarea, { comentario: "Sin etiquetar a nadie", ids_mencionados: [externo.id_usuario, 999999] });
    const nuevo = comentarios.at(-1);
    assert.deepEqual(nuevo.menciones, []);
    assert.equal((await notificacionesRepository.listar(externo.id_usuario)).length, antes, "no se lo notifica");
    assert.equal(await proyectosRepository.esIntegrante(proyecto.id_proyecto, externo.id_usuario), false, "no se lo suma al proyecto");
    // Guardado y lectura de menciones (los usuarios de prueba no tienen nombre en Ciudad Digital,
    // así que el camino completo con @Nombre se prueba a mano en el navegador).
    await tareasRepository.insertarMenciones(nuevo.id_tarea_comentario, [externo.id_usuario, ajeno.id_usuario]);
    const conMenciones = (await tareasService.listarComentarios(colaborador, tareaA.id_tarea)).at(-1);
    assert.deepEqual(conMenciones.menciones.map((m) => m.id_usuario).sort(), [ajeno.id_usuario, externo.id_usuario].sort());
    assert.equal((await usuariosService.listarEtiquetables()).length, 5);
    assert.deepEqual(Object.keys((await usuariosService.listarEtiquetables())[0]).sort(), ["id_usuario", "nombre_usuario"], "sin CUIL ni email");
  });

  // ───────────── Varios responsables ─────────────
  await paso("varios responsables: todos pueden actualizar, todos se enteran y el que se quita deja de poder", async () => {
    const tareaD = await tareasService.crear(supervisor, datosTarea("Tarea D", { ids_responsables: [colaborador.id_usuario, ajeno.id_usuario], fecha_vencimiento: null }));
    assert.deepEqual(tareaD.responsables.map((r) => r.id_usuario).sort(), [colaborador.id_usuario, ajeno.id_usuario].sort());
    for (const responsable of [colaborador, ajeno]) {
      assert.equal((await notificacionesRepository.listar(responsable.id_usuario))[0].id_tnotificacion, TIPOS_NOTIFICACION.TAREA_ASIGNADA);
      assert.equal((await tareasService.obtener(responsable, tareaD.id_tarea)).puede_actualizar, true);
      assert.ok((await tareasService.listar(responsable, { mias: 1 })).some((t) => t.id_tarea === tareaD.id_tarea));
    }
    await tareasService.registrarActualizacion(ajeno, tareaD.id_tarea, { id_tactualizacion: TIPOS_ACTUALIZACION.AVANCE, id_etarea: null, porcentaje_avance: 30, comentario: null });
    await tareasService.mover(colaborador, tareaD.id_tarea, { id_etarea: ESTADOS_TAREA.EN_PROGRESO, ids_columna: null });
    assert.equal((await notificacionesRepository.listar(ajeno.id_usuario))[0].id_tnotificacion, TIPOS_NOTIFICACION.AVANCE_REGISTRADO, "al otro responsable le llega el avance");
    assert.equal((await tareasService.listar(admin, { id_usuario_responsable: ajeno.id_usuario })).filter((t) => t.id_tarea === tareaD.id_tarea).length, 1);

    // Se quita a un responsable: se le avisa y deja de poder actualizar.
    const editada = await tareasService.actualizar(supervisor, tareaD.id_tarea, datosTarea("Tarea D", { ids_responsables: [ajeno.id_usuario], fecha_vencimiento: null }));
    assert.deepEqual(editada.responsables.map((r) => r.id_usuario), [ajeno.id_usuario]);
    const aviso = (await notificacionesRepository.listar(colaborador.id_usuario))[0];
    assert.equal(aviso.id_tnotificacion, TIPOS_NOTIFICACION.TAREA_MODIFICADA);
    assert.match(aviso.texto, /Ya no sos responsable/);
    await falla(403, tareasService.registrarActualizacion(colaborador, tareaD.id_tarea, { id_tactualizacion: TIPOS_ACTUALIZACION.AVANCE, id_etarea: null, porcentaje_avance: 50, comentario: null }));
    // Volver a sumarlo reutiliza la misma fila (habilita = 1), no la duplica.
    const otraVez = await tareasService.actualizar(supervisor, tareaD.id_tarea, datosTarea("Tarea D", { ids_responsables: [ajeno.id_usuario, colaborador.id_usuario], fecha_vencimiento: null }));
    assert.equal(otraVez.responsables.length, 2);
    // Sin responsables = sin asignar.
    const sinNadie = await tareasService.actualizar(supervisor, tareaD.id_tarea, datosTarea("Tarea D", { ids_responsables: [], fecha_vencimiento: null }));
    assert.deepEqual(sinNadie.responsables, []);
    // Se archiva para que no cambie los totales de los pasos que siguen.
    await tareasService.archivar(supervisor, tareaD.id_tarea, 1);
  });

  await paso("tablero e historial: las finalizadas viejas salen del tablero y se encuentran en el historial", async () => {
    const tareaE = await tareasService.crear(supervisor, datosTarea("Tarea E", { fecha_vencimiento: null }));
    await tareasService.mover(supervisor, tareaE.id_tarea, { id_etarea: ESTADOS_TAREA.FINALIZADA, ids_columna: null });
    const enTablero = async () => (await tareasService.listar(admin, { tablero: 1 })).some((t) => t.id_tarea === tareaE.id_tarea);
    assert.equal(await enTablero(), true, "recién finalizada: sigue en el tablero");

    // Se simula que se finalizó hace 30 días.
    await consultar("UPDATE tarea SET fecha_finalizacion = DATE_SUB(NOW(), INTERVAL 30 DAY) WHERE id_tarea = ?", [tareaE.id_tarea]);
    assert.equal(await enTablero(), false, "finalizada hace 30 días: ya no está en el tablero");
    assert.ok((await tareasService.listar(admin, {})).some((t) => t.id_tarea === tareaE.id_tarea), "la lista de tareas la sigue mostrando");
    assert.equal((await tareasService.listar(admin, { tablero: 1 })).length, (await tareasService.listar(admin, {})).length - 1, "las no finalizadas no se ocultan");

    const historial = await tareasService.listar(admin, { solo_finalizadas: 1, ordenar: "finalizacion" });
    assert.deepEqual(historial.map((t) => t.titulo), ["Tarea E"], "el historial trae solo finalizadas");
    const haceUnMes = hoyMas(-30);
    assert.equal((await tareasService.listar(admin, { solo_finalizadas: 1, finalizada_desde: haceUnMes, finalizada_hasta: haceUnMes })).length, 1);
    assert.equal((await tareasService.listar(admin, { solo_finalizadas: 1, finalizada_desde: hoyMas(-5) })).length, 0);
    assert.equal((await tareasService.listar(admin, { solo_finalizadas: 1, finalizada_hasta: hoyMas(-40) })).length, 0);
    // Reabrirla la devuelve al tablero.
    await tareasService.mover(supervisor, tareaE.id_tarea, { id_etarea: ESTADOS_TAREA.EN_PROGRESO, ids_columna: null });
    assert.equal(await enTablero(), true);
    // Se archiva para que no cambie los totales de los pasos que siguen.
    await tareasService.archivar(supervisor, tareaE.id_tarea, 1);
  });

  await paso("responsables de proyecto: se marcan varios, solo quien gestiona, y no cambia permisos", async () => {
    const responsables = async () => (await proyectosService.listarIntegrantes(admin, proyecto.id_proyecto)).filter((i) => i.es_responsable === 1).map((i) => i.id_usuario);
    assert.deepEqual(await responsables(), [supervisor.id_usuario]);
    await falla(403, proyectosService.marcarResponsable(colaborador, proyecto.id_proyecto, colaborador.id_usuario, 1));
    await falla(404, proyectosService.marcarResponsable(supervisor, proyecto.id_proyecto, 999999, 1));
    await proyectosService.marcarResponsable(supervisor, proyecto.id_proyecto, colaborador.id_usuario, 1);
    assert.deepEqual((await responsables()).sort(), [supervisor.id_usuario, colaborador.id_usuario].sort());
    assert.equal((await proyectosService.obtener(colaborador, proyecto.id_proyecto)).puede_gestionar, false, "ser responsable es informativo");
    await proyectosService.marcarResponsable(supervisor, proyecto.id_proyecto, colaborador.id_usuario, 0);
    assert.deepEqual(await responsables(), [supervisor.id_usuario]);
  });

  // ───────────── Notificaciones ─────────────
  await paso("notificaciones: no leídas, marcar una (solo propias) y marcar todas", async () => {
    const mias = await notificacionesService.listar(colaborador, {});
    const antes = (await notificacionesService.resumen(colaborador)).no_leidas;
    assert.equal(antes, mias.length);
    await falla(404, notificacionesService.marcarLeida(ajeno, mias[0].id_notificacion));
    await notificacionesService.marcarLeida(colaborador, mias[0].id_notificacion);
    assert.equal((await notificacionesService.resumen(colaborador)).no_leidas, antes - 1);
    assert.equal((await notificacionesService.listar(colaborador, { solo_no_leidas: 1 })).length, antes - 1);
    await notificacionesService.marcarTodasLeidas(colaborador);
    assert.equal((await notificacionesService.resumen(colaborador)).no_leidas, 0);
  });

  await paso("aviso automático de vencimiento: avisa una vez y no repite", async () => {
    // B (vencida) y A no entran: A vence en 12 días. Se asigna C con vencimiento mañana.
    await tareasService.actualizar(supervisor, tareaC.id_tarea, datosTarea("Tarea C", { ids_responsables: [colaborador.id_usuario, ajeno.id_usuario], fecha_vencimiento: hoyMas(1) }));
    const creadas = await notificacionesService.generarAvisosDeVencimiento();
    assert.equal(creadas, 3, "una por B (vencida) y una por cada uno de los dos responsables de C (vence mañana)");
    assert.equal(await notificacionesService.generarAvisosDeVencimiento(), 0, "no repite el aviso");
    const avisos = (await notificacionesRepository.listar(colaborador.id_usuario)).filter((n) => n.id_tnotificacion === TIPOS_NOTIFICACION.PROXIMA_A_VENCER);
    assert.equal(avisos.length, 2);
    assert.ok(avisos.some((n) => n.texto.startsWith("Venció")) && avisos.some((n) => n.texto.startsWith("Está por vencer")));
    const delOtro = (await notificacionesRepository.listar(ajeno.id_usuario)).filter((n) => n.id_tnotificacion === TIPOS_NOTIFICACION.PROXIMA_A_VENCER);
    assert.equal(delOtro.length, 1, "al segundo responsable de C también le llega");
  });

  // ───────────── Panel y actividad ─────────────
  await paso("panel: vista de equipo para gestores y personal para colaboradores", async () => {
    const equipo = await dashboardService.obtener(supervisor);
    assert.equal(equipo.vista, "equipo");
    assert.equal(equipo.resumen.total, 3);
    assert.equal(equipo.resumen.proyectos_activos, 1);
    assert.equal(equipo.resumen.en_progreso, 1);
    assert.equal(equipo.resumen.en_revision, 1);
    assert.equal(equipo.resumen.pendientes, 1);
    assert.equal(equipo.resumen.vencidas, 1);
    assert.equal(equipo.resumen.proximas_a_vencer, 1);
    assert.equal(equipo.tareas_vencidas[0].titulo, "Tarea B");
    assert.equal(equipo.proyectos[0].total_tareas, 3);
    assert.equal(equipo.proyectos[0].tareas_vencidas, 1);
    assert.equal(typeof equipo.proyectos[0].avance, "number");
    assert.ok(equipo.actividad.length > 0);

    const personal = await dashboardService.obtener(colaborador);
    assert.equal(personal.vista, "personal");
    assert.equal(personal.resumen.total, 2, "cuenta solo las tareas del colaborador");

    assert.equal((await actividadRepository.listar(admin, { id_tarea: tareaA.id_tarea })).every((a) => a.id_tarea === tareaA.id_tarea), true);
    // No se puede quitar a un integrante que todavía tiene tareas abiertas.
    await falla(409, proyectosService.quitarIntegrante(admin, proyecto.id_proyecto, colaborador.id_usuario));
  });

  // ───────────── Archivar ─────────────
  await paso("archivar: la tarea y el proyecto quedan solo de consulta", async () => {
    await falla(403, tareasService.archivar(colaborador, tareaC.id_tarea, 1));
    await tareasService.archivar(supervisor, tareaC.id_tarea, 1);
    assert.equal((await tareasService.listar(admin, {})).length, 2);
    assert.equal((await tareasService.listar(admin, { archivada: 1 })).length, 3, "C y las tareas D y E archivadas antes");
    await falla(409, tareasService.agregarComentario(colaborador, tareaC.id_tarea, { comentario: "No debería entrar", ids_mencionados: [] }));
    await tareasService.archivar(supervisor, tareaC.id_tarea, 0);

    await proyectosService.archivar(supervisor, proyecto.id_proyecto, 1);
    assert.equal((await proyectosService.listar(admin, {})).length, 0);
    assert.equal((await proyectosService.listar(admin, { archivado: 1 })).length, 1);
    assert.equal((await tareasService.listar(admin, {})).length, 0, "las tareas de un proyecto archivado salen de las listas generales");
    assert.equal((await tareasService.listar(admin, { id_proyecto: proyecto.id_proyecto })).length, 3, "pero se pueden consultar dentro del proyecto");
    await falla(409, tareasService.crear(supervisor, datosTarea("En proyecto archivado")));
    await falla(409, tareasService.mover(supervisor, tareaA.id_tarea, { id_etarea: ESTADOS_TAREA.BLOQUEADA, ids_columna: null }));
    await proyectosService.archivar(supervisor, proyecto.id_proyecto, 0);
    assert.equal((await proyectosService.listar(admin, {})).length, 1);
  });

  return { admin, supervisor, colaborador, ajeno, proyecto, tareaA };
};

// La misma API que usa el front, por HTTP y con un token firmado como los de Ciudad Digital.
const probarApi = async ({ admin, colaborador, ajeno, proyecto, tareaA }) => {
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const token = (usuario) => jwt.sign({ id: usuario.id_persona }, env.jwtSecretKey, { expiresIn: "5m" });
  const pedir = async (usuario, metodo, ruta, cuerpo) => {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { Authorization: token(usuario), "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    return { estado: respuesta.status, datos: await respuesta.json() };
  };

  try {
    await paso("HTTP: catálogos, panel, listas y detalle responden 200", async () => {
      const catalogos = await pedir(admin, "GET", "/catalogos");
      assert.equal(catalogos.estado, 200);
      assert.equal(catalogos.datos.estadosTarea.length, 5);
      assert.equal(catalogos.datos.prioridades.length, 4);
      assert.equal(catalogos.datos.configuracion.dias_finalizadas_en_tablero, env.diasFinalizadasEnTablero);
      for (const ruta of ["/dashboard", "/proyectos", "/usuarios/etiquetables", "/tareas?tablero=1", "/tareas?solo_finalizadas=1&ordenar=finalizacion&finalizada_desde=2026-01-01", "/tareas?mias=1&ordenar=vencimiento", "/actividad?cantidad=5", "/notificaciones", "/notificaciones/resumen", "/usuarios", `/proyectos/${proyecto.id_proyecto}`, `/proyectos/${proyecto.id_proyecto}/integrantes`, `/tareas/${tareaA.id_tarea}`, `/tareas/${tareaA.id_tarea}/actualizaciones`, `/tareas/${tareaA.id_tarea}/comentarios`]) {
        const respuesta = await pedir(admin, "GET", ruta);
        assert.equal(respuesta.estado, 200, `${ruta} -> ${respuesta.estado} ${JSON.stringify(respuesta.datos)}`);
      }
    });

    await paso("HTTP: los permisos por rol se validan en el back", async () => {
      assert.equal((await pedir(colaborador, "GET", "/usuarios")).estado, 403);
      assert.equal((await pedir(colaborador, "POST", "/usuarios", { id_persona: -50, id_tusuario: 1 })).estado, 403);
      assert.equal((await pedir(colaborador, "POST", "/proyectos", { nombre_proyecto: "No", id_eproyecto: 1 })).estado, 403);
      assert.equal((await pedir(colaborador, "POST", "/tareas", { id_proyecto: proyecto.id_proyecto, titulo: "No va", id_prioridad: 2 })).estado, 403);
      assert.equal((await pedir(colaborador, "PATCH", `/proyectos/${proyecto.id_proyecto}/integrantes/${colaborador.id_usuario}`, { es_responsable: 1 })).estado, 403);
      assert.equal((await pedir(colaborador, "GET", "/usuarios/etiquetables")).estado, 200, "cualquier usuario puede pedir a quién etiquetar");
      assert.equal((await pedir(colaborador, "PUT", `/tareas/${tareaA.id_tarea}`, { titulo: "No va", id_prioridad: 2 })).estado, 403);
      assert.equal((await pedir({ id_persona: -777 }, "GET", "/proyectos")).estado, 403, "persona sin usuario en el Organizador");
      assert.equal((await pedir({ id_persona: -777 }, "GET", "/usuarios/authStatus")).estado, 401, "persona que no existe en Ciudad Digital");
    });

    await paso("HTTP: validaciones (400 con errores por campo), 404 y 409", async () => {
      const invalido = await pedir(admin, "POST", "/tareas", { titulo: "ab", fecha_inicio: "2026-13-40" });
      assert.equal(invalido.estado, 400);
      assert.deepEqual(Object.keys(invalido.datos.errores).sort(), ["fecha_inicio", "id_prioridad", "id_proyecto", "titulo"]);
      assert.equal((await pedir(admin, "GET", "/tareas/abc")).estado, 400);
      assert.equal((await pedir(admin, "GET", "/tareas/999999")).estado, 404);
      assert.equal((await pedir(admin, "GET", "/tareas?id_etarea=99")).estado, 400);
      assert.equal((await pedir(admin, "POST", "/usuarios", { id_persona: ajeno.id_persona, id_tusuario: 3 })).estado, 400, "un id_persona negativo no pasa la validación");
      assert.equal((await pedir(admin, "POST", "/usuarios", { id_persona: 2147483646, id_tusuario: 3 })).estado, 404, "persona que no existe en Ciudad Digital");
      assert.equal((await pedir(admin, "GET", "/usuarios/persona/123")).estado, 400);
      const inyeccion = await pedir(admin, "GET", `/tareas?buscar=${encodeURIComponent("' OR '1'='1")}`);
      assert.equal(inyeccion.estado, 200);
      assert.equal(inyeccion.datos.length, 0, "el texto de búsqueda se trata como dato, no como SQL");
    });

    await paso("HTTP: flujo completo de una tarea (crear, mover, actualizar, comentar)", async () => {
      const creada = await pedir(admin, "POST", "/tareas", { id_proyecto: proyecto.id_proyecto, titulo: "Tarea por HTTP", id_prioridad: 3, ids_responsables: [colaborador.id_usuario, ajeno.id_usuario], fecha_vencimiento: hoyMas(4) });
      assert.equal(creada.estado, 201);
      assert.equal(creada.datos.responsables.length, 2);
      const invalida = await pedir(admin, "POST", "/tareas", { id_proyecto: proyecto.id_proyecto, titulo: "Lista inválida", id_prioridad: 3, ids_responsables: "todos" });
      assert.equal(invalida.estado, 400);
      assert.ok(invalida.datos.errores.ids_responsables);
      const marcado = await pedir(admin, "PATCH", `/proyectos/${proyecto.id_proyecto}/integrantes/${colaborador.id_usuario}`, { es_responsable: 1 });
      assert.equal(marcado.estado, 200);
      assert.equal(marcado.datos.find((i) => i.id_usuario === colaborador.id_usuario).es_responsable, 1);
      const id = creada.datos.id_tarea;
      const movida = await pedir(colaborador, "PATCH", `/tareas/${id}/mover`, { id_etarea: 2, ids_columna: [id] });
      assert.equal(movida.estado, 200, JSON.stringify(movida.datos));
      assert.equal(movida.datos.nombre_etarea, "En progreso");
      const actualizada = await pedir(colaborador, "POST", `/tareas/${id}/actualizaciones`, { id_tactualizacion: 1, porcentaje_avance: 55, comentario: "Vamos por la mitad" });
      assert.equal(actualizada.estado, 201);
      assert.equal(actualizada.datos.porcentaje_avance, 55);
      const comentada = await pedir(colaborador, "POST", `/tareas/${id}/comentarios`, { comentario: "Listo para revisar", ids_mencionados: [ajeno.id_usuario] });
      assert.equal(comentada.estado, 201);
      assert.deepEqual(comentada.datos.at(-1).menciones, [], "sin @Nombre en el texto no hay mención");
      const historial = await pedir(admin, "GET", `/tareas/${id}/actualizaciones`);
      assert.equal(historial.datos.length, 2);
      const archivada = await pedir(admin, "PATCH", `/tareas/${id}/archivar`, { archivada: 1 });
      assert.equal(archivada.datos.archivada, 1);
    });
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
  }
};

// Integración con git: lo que hace el back con cada commit que avisa el hook de Claude Code.
// Corre al final para no cambiar las cantidades que verifican los pasos anteriores.
const probarIntegracionConGit = async ({ admin, supervisor, colaborador, proyecto, tareaA }) => {
  const REPO = "github.com/ditec-desarrollo/repo-de-prueba";
  const sha = (numero) => String(numero).padStart(40, "0");
  // Lo mismo que deja pasar validations/integracionesValidation.js.
  const commit = (numero, extra = {}) => ({
    commit_sha: sha(numero),
    repositorio: REPO,
    carpeta: "repo-de-prueba",
    rama: "dev",
    autor_nombre: "Colaborador Prueba",
    autor_email: "colaborador@prueba.test",
    autor_alias: null,
    mensaje: `Commit de prueba ${numero}`,
    fecha_commit: `${hoy} 10:00:00`,
    es_merge: 0,
    ...extra,
  });
  const anotado = async (numero) => (await integracionesService.listarCommits({ cantidad: 200 })).find((c) => c.commit_sha === sha(numero));
  let repositorios;

  await paso("commits: un merge se ignora y un repositorio sin vincular queda pendiente", async () => {
    const sinProyecto = await integracionesService.recibirCommit(commit(1));
    assert.equal(sinProyecto.resultado, RESULTADOS_COMMIT.SIN_PROYECTO);
    assert.equal(sinProyecto.pendiente, true);
    assert.equal(sinProyecto.id_tarea, null);
    const merge = await integracionesService.recibirCommit(commit(2, { mensaje: "Merge branch 'dev' into main" }));
    assert.equal(merge.resultado, RESULTADOS_COMMIT.IGNORADO_MERGE);
    assert.equal(merge.pendiente, false);
    assert.equal((await integracionesService.listarCommits({ solo_pendientes: 1 })).length, 1);
  });

  await paso("repositorios: los vincula quien gestiona el proyecto, sin duplicados, y se reprocesa lo pendiente", async () => {
    await falla(403, integracionesService.vincularRepositorio(colaborador, proyecto.id_proyecto, REPO));
    repositorios = await integracionesService.vincularRepositorio(supervisor, proyecto.id_proyecto, REPO);
    assert.deepEqual(repositorios.map((r) => r.repositorio), [REPO]);
    await falla(409, integracionesService.vincularRepositorio(supervisor, proyecto.id_proyecto, REPO));
    assert.equal((await proyectosService.obtener(supervisor, proyecto.id_proyecto)).repositorios.length, 1);
    // El commit 1 ya tiene proyecto; ahora le falta saber de quién es.
    const pendiente = await anotado(1);
    assert.equal(pendiente.resultado, RESULTADOS_COMMIT.SIN_USUARIO);
    assert.equal(pendiente.id_proyecto, proyecto.id_proyecto);
  });

  await paso("alias de git: al cargarlo, el commit pendiente pasa a ser una tarea finalizada de su autor", async () => {
    const alias = await integracionesService.agregarAlias(admin, colaborador.id_usuario, "colaborador@prueba.test");
    assert.deepEqual(alias.map((a) => a.alias), ["colaborador@prueba.test"]);
    await falla(409, integracionesService.agregarAlias(admin, supervisor.id_usuario, "colaborador@prueba.test"));
    await falla(404, integracionesService.agregarAlias(admin, 999999, "nadie@prueba.test"));

    const resuelto = await anotado(1);
    assert.equal(resuelto.resultado, RESULTADOS_COMMIT.TAREA_CREADA);
    assert.equal(resuelto.id_usuario, colaborador.id_usuario);
    assert.equal(resuelto.titulo_tarea, "Commit de prueba 1");
    const tarea = await tareasService.obtener(admin, resuelto.id_tarea);
    assert.equal(tarea.id_etarea, ESTADOS_TAREA.FINALIZADA);
    assert.equal(tarea.porcentaje_avance, 100);
    assert.ok(tarea.fecha_finalizacion, "una tarea que nace finalizada tiene fecha de finalización");
    assert.equal(tarea.fecha_inicio, hoy);
    assert.equal(tarea.id_usuario_alta, colaborador.id_usuario);
    assert.deepEqual(tarea.responsables.map((r) => r.id_usuario), [colaborador.id_usuario]);
    assert.ok(tarea.descripcion.includes(`Commit 0000000 · ${REPO} · rama dev`));
  });

  await paso("commits: reenviar el mismo commit no genera otra tarea", async () => {
    const antes = (await tareasService.listar(admin, { id_proyecto: proyecto.id_proyecto })).length;
    const repetido = await integracionesService.recibirCommit(commit(1));
    assert.equal(repetido.repetido, true);
    assert.equal(repetido.resultado, RESULTADOS_COMMIT.TAREA_CREADA);
    assert.equal(repetido.id_tarea, (await anotado(1)).id_tarea);
    assert.equal((await tareasService.listar(admin, { id_proyecto: proyecto.id_proyecto })).length, antes);
  });

  await paso('commits: "tarea #N" registra una novedad en esa tarea; si no existe, crea una nueva', async () => {
    await integracionesService.agregarAlias(admin, supervisor.id_usuario, "supervisor prueba");
    // El nombre con el que firma git se compara sin mayúsculas ni espacios de más.
    const deSupervisor = { autor_nombre: "Supervisor  PRUEBA", autor_email: null };
    const antes = (await tareasService.listarActualizaciones(admin, tareaA.id_tarea)).length;

    const avance = await integracionesService.recibirCommit(commit(3, { ...deSupervisor, mensaje: `validaciones listas (tarea #${tareaA.id_tarea})` }));
    assert.equal(avance.resultado, RESULTADOS_COMMIT.TAREA_ACTUALIZADA);
    assert.equal(avance.id_tarea, tareaA.id_tarea);
    const historial = await tareasService.listarActualizaciones(admin, tareaA.id_tarea);
    assert.equal(historial.length, antes + 1);
    assert.ok(historial[0].comentario.includes("validaciones listas"));
    assert.ok(historial[0].comentario.includes("Commit 0000000"));

    const sinTarea = await integracionesService.recibirCommit(commit(4, { ...deSupervisor, mensaje: "otra cosa (tarea #999999)" }));
    assert.equal(sinTarea.resultado, RESULTADOS_COMMIT.TAREA_CREADA);
    assert.notEqual(sinTarea.id_tarea, 999999);
  });

  await paso('commits: "finaliza tarea #N" además deja la tarea finalizada', async () => {
    const deSupervisor = { autor_nombre: "Supervisor Prueba", autor_email: null };
    const abierta = await tareasService.crear(supervisor, {
      id_proyecto: proyecto.id_proyecto,
      titulo: "Tarea que cierra un commit",
      descripcion: null,
      ids_responsables: [colaborador.id_usuario],
      id_prioridad: PRIORIDADES.MEDIA,
      id_etarea: ESTADOS_TAREA.EN_PROGRESO,
      porcentaje_avance: 40,
      fecha_inicio: null,
      fecha_vencimiento: null,
    });

    // Nombrarla sin verbo de cierre solo deja la novedad.
    const avance = await integracionesService.recibirCommit(commit(20, { ...deSupervisor, mensaje: `sigo con esto (tarea #${abierta.id_tarea})` }));
    assert.equal(avance.resultado, RESULTADOS_COMMIT.TAREA_ACTUALIZADA);
    assert.equal((await tareasService.obtener(admin, abierta.id_tarea)).id_etarea, ESTADOS_TAREA.EN_PROGRESO);

    const cierre = await integracionesService.recibirCommit(commit(21, { ...deSupervisor, mensaje: `Último ajuste\n\nFinaliza la tarea #${abierta.id_tarea}` }));
    assert.equal(cierre.resultado, RESULTADOS_COMMIT.TAREA_FINALIZADA);
    assert.equal(cierre.id_tarea, abierta.id_tarea);
    assert.equal(cierre.pendiente, false);
    const cerrada = await tareasService.obtener(admin, abierta.id_tarea);
    assert.equal(cerrada.id_etarea, ESTADOS_TAREA.FINALIZADA);
    assert.equal(cerrada.porcentaje_avance, 100);
    assert.ok(cerrada.fecha_finalizacion);
    const [ultima] = await tareasService.listarActualizaciones(admin, abierta.id_tarea);
    assert.equal(ultima.id_etarea_nuevo, ESTADOS_TAREA.FINALIZADA);
    assert.ok(ultima.comentario.includes("Último ajuste"));
  });

  await paso("commits: la identidad fija de la máquina gana, y un autor que no era integrante se suma al proyecto", async () => {
    await usuariosRepository.crear({ id_persona: -5, id_tusuario: ROLES.COLABORADOR, id_usuario_alta: null });
    const externo = await usuariosRepository.buscarPorPersona(-5);
    await integracionesService.agregarAlias(admin, externo.id_usuario, "externo");
    assert.equal(await proyectosRepository.esIntegrante(proyecto.id_proyecto, externo.id_usuario), false);

    // Firma git como el colaborador, pero la máquina dice que es "externo".
    const creado = await integracionesService.recibirCommit(commit(5, { autor_alias: "externo" }));
    assert.equal(creado.resultado, RESULTADOS_COMMIT.TAREA_CREADA);
    assert.equal((await anotado(5)).id_usuario, externo.id_usuario);
    assert.equal(await proyectosRepository.esIntegrante(proyecto.id_proyecto, externo.id_usuario), true);

    const alias = await integracionesService.listarAlias(externo.id_usuario);
    assert.deepEqual(await integracionesService.quitarAlias(admin, externo.id_usuario, alias[0].id_usuario_alias_git), []);
    await falla(404, integracionesService.quitarAlias(admin, externo.id_usuario, alias[0].id_usuario_alias_git));
  });

  await paso("commits: en un proyecto archivado esperan, y al desvincular el repositorio dejan de entrar", async () => {
    await proyectosService.archivar(supervisor, proyecto.id_proyecto, 1);
    const archivado = await integracionesService.recibirCommit(commit(6));
    assert.equal(archivado.resultado, RESULTADOS_COMMIT.PROYECTO_ARCHIVADO);
    assert.equal(archivado.pendiente, true);
    await proyectosService.archivar(supervisor, proyecto.id_proyecto, 0);
    const conteo = await integracionesService.reprocesarPendientes();
    assert.deepEqual(conteo, { revisados: 1, tareas_creadas: 1, tareas_actualizadas: 0, siguen_pendientes: 0, con_error: 0 });

    await falla(404, integracionesService.desvincularRepositorio(supervisor, proyecto.id_proyecto, 999999));
    assert.deepEqual(await integracionesService.desvincularRepositorio(supervisor, proyecto.id_proyecto, repositorios[0].id_proyecto_repositorio), []);
    assert.equal((await integracionesService.recibirCommit(commit(7))).resultado, RESULTADOS_COMMIT.SIN_PROYECTO);
    // Sin la URL vinculada, vale el nombre de la carpeta; y al vincular se resuelve el que esperaba.
    repositorios = await integracionesService.vincularRepositorio(supervisor, proyecto.id_proyecto, "repo-de-prueba");
    assert.equal((await anotado(7)).resultado, RESULTADOS_COMMIT.TAREA_CREADA);
    // Volver a vincular la URL reutiliza la fila que se había deshabilitado.
    repositorios = await integracionesService.vincularRepositorio(supervisor, proyecto.id_proyecto, REPO);
    assert.equal(repositorios.length, 2);
  });

  await paso("HTTP: consultar y reprocesar commits es solo del administrador; la entrada pide la clave", async () => {
    const servidor = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const base = `http://127.0.0.1:${servidor.address().port}`;
    const con = (usuario) => ({ Authorization: jwt.sign({ id: usuario.id_persona }, env.jwtSecretKey, { expiresIn: "5m" }) });
    try {
      assert.equal((await fetch(`${base}/integraciones/commits`, { headers: con(colaborador) })).status, 403);
      const lista = await fetch(`${base}/integraciones/commits?solo_pendientes=1`, { headers: con(admin) });
      assert.equal(lista.status, 200);
      assert.deepEqual(await lista.json(), []);
      assert.equal((await fetch(`${base}/integraciones/commits/reprocesar`, { method: "POST", headers: con(admin) })).status, 200);
      const repos = await fetch(`${base}/proyectos/${proyecto.id_proyecto}/repositorios`, { headers: con(colaborador) });
      assert.equal((await repos.json()).length, 2);

      // Sin clave: 401 si la integración está configurada en el .env, 503 si está apagada.
      const sinClave = await fetch(`${base}/integraciones/commits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      assert.equal(sinClave.status, env.integracionApiKey ? 401 : 503);
      if (env.integracionApiKey) {
        const cuerpo = { ...commit(8), fecha: `${hoy}T10:00:00-03:00`, repositorio: `https://${REPO}.git` };
        const creado = await fetch(`${base}/integraciones/commits`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Api-Key": env.integracionApiKey },
          body: JSON.stringify(cuerpo),
        });
        assert.equal(creado.status, 201);
        assert.equal((await creado.json()).resultado, RESULTADOS_COMMIT.TAREA_CREADA);
      }
    } finally {
      await new Promise((resolve) => servidor.close(resolve));
    }
  });
};

const principal = async () => {
  console.log(`Prueba de integración sobre ${env.db.database} en ${env.db.host}:${env.db.port}\n`);
  await exigirBaseVacia();
  [{ hoy }] = await consultar("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy");
  try {
    const contexto = await probarServicios();
    await probarApi(contexto);
    await probarIntegracionConGit(contexto);
    console.log(`\n${pasos} pasos correctos.`);
  } finally {
    await limpiar();
    console.log("Datos de prueba borrados.");
  }
};

principal()
  .catch((error) => {
    console.error("\n✖ Falló la prueba de integración:\n", error);
    process.exitCode = 1;
  })
  .finally(cerrarPool);
