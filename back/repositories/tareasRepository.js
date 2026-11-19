import { consultar, TABLA_PERSONA } from "../config/dbOrganizador.js";
import { filtroProyectosVisibles, limite } from "./visibilidad.js";
import { nombreCompleto } from "./usuariosRepository.js";

// `vencida` y `dias_para_vencer` se calculan en la base para que la fecha de "hoy" sea una sola.
// Los responsables no salen de acá (son varios por tarea): los agrega adjuntarResponsables().
const SELECT_TAREA = `
  SELECT
    t.id_tarea,
    t.id_proyecto,
    pr.nombre_proyecto,
    pr.archivado AS proyecto_archivado,
    t.titulo,
    t.descripcion,
    t.id_prioridad,
    pri.nombre_prioridad,
    t.id_etarea,
    et.nombre_etarea,
    et.es_final,
    t.porcentaje_avance,
    t.fecha_inicio,
    t.fecha_vencimiento,
    t.fecha_finalizacion,
    t.orden,
    t.id_usuario_alta,
    ${nombreCompleto("pcre")} AS nombre_creador,
    t.archivada,
    t.fecha_alta,
    t.fecha_modificacion,
    (et.es_final = 0 AND t.fecha_vencimiento IS NOT NULL AND t.fecha_vencimiento < CURDATE()) AS vencida,
    DATEDIFF(t.fecha_vencimiento, CURDATE()) AS dias_para_vencer
  FROM tarea t
  INNER JOIN proyecto pr ON pr.id_proyecto = t.id_proyecto
  INNER JOIN estado_tarea et ON et.id_etarea = t.id_etarea
  INNER JOIN prioridad pri ON pri.id_prioridad = t.id_prioridad
  LEFT JOIN usuario ucre ON ucre.id_usuario = t.id_usuario_alta
  LEFT JOIN ${TABLA_PERSONA} pcre ON pcre.id_persona = ucre.id_persona`;

// "Esta tarea tiene a ese usuario como responsable", para usar en un WHERE sobre tarea (alias t).
const ES_RESPONSABLE = `EXISTS (
  SELECT 1 FROM tarea_responsable tr_f
  WHERE tr_f.id_tarea = t.id_tarea AND tr_f.id_usuario = ? AND tr_f.habilita = 1
)`;
const SIN_RESPONSABLE = `NOT EXISTS (
  SELECT 1 FROM tarea_responsable tr_f WHERE tr_f.id_tarea = t.id_tarea AND tr_f.habilita = 1
)`;

// Agrega a cada tarea su lista `responsables: [{ id_usuario, nombre_usuario }]`.
// Una consulta por tanda de tareas, en vez de una por tarea.
const TANDA = 500;
export const adjuntarResponsables = async (tareas, connection) => {
  const porTarea = new Map(tareas.map((tarea) => [tarea.id_tarea, []]));
  const ids = [...porTarea.keys()];

  for (let desde = 0; desde < ids.length; desde += TANDA) {
    const tanda = ids.slice(desde, desde + TANDA);
    const filas = await consultar(
      `SELECT tr.id_tarea, u.id_usuario, ${nombreCompleto("p")} AS nombre_usuario
       FROM tarea_responsable tr
       INNER JOIN usuario u ON u.id_usuario = tr.id_usuario
       LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
       WHERE tr.habilita = 1 AND tr.id_tarea IN (${tanda.map(() => "?").join(", ")})
       ORDER BY p.apellido_persona, p.nombre_persona, u.id_usuario`,
      tanda,
      connection,
    );
    for (const { id_tarea, ...responsable } of filas) porTarea.get(id_tarea).push(responsable);
  }

  return tareas.map((tarea) => ({ ...tarea, responsables: porTarea.get(tarea.id_tarea) }));
};

// `dias`: { proximas, finalizadas } -> cuántos días cuentan como "próxima a vencer" y cuántos
// días sigue en el tablero una tarea finalizada (los dos salen del .env).
export const listar = async (usuario, filtros, dias = {}) => {
  const visibles = filtroProyectosVisibles(usuario, "t");
  const condiciones = ["t.habilita = 1", "pr.habilita = 1", visibles.sql];
  const params = [...visibles.params];

  const agregar = (sql, ...valores) => {
    condiciones.push(sql);
    params.push(...valores);
  };

  // Por defecto no se muestran las archivadas ni las de proyectos archivados.
  agregar("t.archivada = ?", filtros.archivada ?? 0);
  if (!filtros.id_proyecto && !filtros.archivada) condiciones.push("pr.archivado = 0");

  if (filtros.id_proyecto) agregar("t.id_proyecto = ?", filtros.id_proyecto);
  if (filtros.id_usuario_responsable) agregar(ES_RESPONSABLE, filtros.id_usuario_responsable);
  if (filtros.sin_responsable) condiciones.push(SIN_RESPONSABLE);
  if (filtros.id_etarea) agregar("t.id_etarea = ?", filtros.id_etarea);
  if (filtros.id_prioridad) agregar("t.id_prioridad = ?", filtros.id_prioridad);
  if (filtros.vence_desde) agregar("t.fecha_vencimiento >= ?", filtros.vence_desde);
  if (filtros.vence_hasta) agregar("t.fecha_vencimiento <= ?", filtros.vence_hasta);
  if (filtros.buscar) agregar("(t.titulo LIKE ? OR pr.nombre_proyecto LIKE ?)", `%${filtros.buscar}%`, `%${filtros.buscar}%`);

  // Tablero: las finalizadas hace más de N días dejan de mostrarse (siguen en el historial).
  // No cambia nada en la tarea: es solo qué se trae.
  if (filtros.tablero) {
    agregar("(et.es_final = 0 OR t.fecha_finalizacion IS NULL OR t.fecha_finalizacion >= DATE_SUB(CURDATE(), INTERVAL ? DAY))", dias.finalizadas ?? 7);
  }
  // Historial: solo finalizadas, opcionalmente por rango de fecha de finalización.
  if (filtros.solo_finalizadas) condiciones.push("et.es_final = 1");
  if (filtros.finalizada_desde) agregar("t.fecha_finalizacion >= ?", filtros.finalizada_desde);
  if (filtros.finalizada_hasta) agregar("t.fecha_finalizacion < DATE_ADD(?, INTERVAL 1 DAY)", filtros.finalizada_hasta);

  if (filtros.vencimiento === "vencidas") {
    condiciones.push("et.es_final = 0 AND t.fecha_vencimiento < CURDATE()");
  } else if (filtros.vencimiento === "proximas") {
    agregar("et.es_final = 0 AND t.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)", dias.proximas ?? 2);
  }

  // El orden sale de una lista fija, nunca del texto que manda el cliente.
  const ORDENES = {
    vencimiento: "t.fecha_vencimiento IS NULL, t.fecha_vencimiento, pri.orden DESC, t.id_tarea",
    finalizacion: "t.fecha_finalizacion DESC, t.id_tarea DESC",
    tablero: "et.orden, t.orden, t.id_tarea",
  };
  const orden = ORDENES[filtros.ordenar] ?? ORDENES.tablero;

  const tareas = await consultar(
    `${SELECT_TAREA}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${orden}
     LIMIT ${limite(filtros.limite, 1000, 2000)}`,
    params,
  );
  return adjuntarResponsables(tareas);
};

export const obtener = async (id_tarea, connection) => {
  const filas = await consultar(`${SELECT_TAREA} WHERE t.id_tarea = ? AND t.habilita = 1 LIMIT 1`, [id_tarea], connection);
  if (filas.length === 0) return null;
  const [tarea] = await adjuntarResponsables(filas, connection);
  return tarea;
};

// La tarjeta nueva va al final: el orden es único en toda la tabla, así reordenar una columna
// (permutar los valores de sus tarjetas) nunca choca con otra.
export const siguienteOrden = async (connection) => {
  const filas = await consultar("SELECT COALESCE(MAX(orden), 0) + 1 AS orden FROM tarea", [], connection);
  return filas[0].orden;
};

export const crear = async (datos, connection) => {
  const resultado = await consultar(
    `INSERT INTO tarea
       (id_proyecto, titulo, descripcion, id_prioridad, id_etarea, porcentaje_avance,
        fecha_inicio, fecha_vencimiento, fecha_finalizacion, orden, id_usuario_alta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${datos.finalizada ? "NOW()" : "NULL"}, ?, ?)`,
    [
      datos.id_proyecto,
      datos.titulo,
      datos.descripcion,
      datos.id_prioridad,
      datos.id_etarea,
      datos.porcentaje_avance,
      datos.fecha_inicio,
      datos.fecha_vencimiento,
      datos.orden,
      datos.id_usuario_alta,
    ],
    connection,
  );
  return resultado.insertId;
};

// Datos generales de la tarea (los que edita quien gestiona el proyecto).
export const actualizarDatos = (id_tarea, datos, connection) =>
  consultar(
    `UPDATE tarea
     SET titulo = ?, descripcion = ?, id_prioridad = ?, fecha_inicio = ?, fecha_vencimiento = ?
     WHERE id_tarea = ?`,
    [datos.titulo, datos.descripcion, datos.id_prioridad, datos.fecha_inicio, datos.fecha_vencimiento, id_tarea],
    connection,
  );

// Deja como responsables de la tarea exactamente a `ids`: deshabilita a los que ya no están
// y da de alta (o vuelve a habilitar) a los que sí. Mismo recurso que agregarIntegrante.
export const reemplazarResponsables = async (id_tarea, ids, id_usuario_alta, connection) => {
  if (ids.length === 0) {
    await consultar("UPDATE tarea_responsable SET habilita = 0 WHERE id_tarea = ? AND habilita = 1", [id_tarea], connection);
    return;
  }
  const marcas = ids.map(() => "?").join(", ");
  await consultar(
    `UPDATE tarea_responsable SET habilita = 0 WHERE id_tarea = ? AND habilita = 1 AND id_usuario NOT IN (${marcas})`,
    [id_tarea, ...ids],
    connection,
  );
  await consultar(
    `INSERT INTO tarea_responsable (id_tarea, id_usuario, id_usuario_alta)
     VALUES ${ids.map(() => "(?, ?, ?)").join(", ")}
     ON DUPLICATE KEY UPDATE habilita = 1`,
    ids.flatMap((id_usuario) => [id_tarea, id_usuario, id_usuario_alta]),
    connection,
  );
};

// Estado y avance. fecha_finalizacion se completa al entrar a un estado final y se limpia al salir.
export const actualizarSeguimiento = (id_tarea, { id_etarea, porcentaje_avance, esFinal }, connection) =>
  consultar(
    `UPDATE tarea
     SET id_etarea = ?,
         porcentaje_avance = ?,
         fecha_finalizacion = ${esFinal ? "COALESCE(fecha_finalizacion, NOW())" : "NULL"}
     WHERE id_tarea = ?`,
    [id_etarea, porcentaje_avance, id_tarea],
    connection,
  );

export const archivar = (id_tarea, archivada, connection) =>
  consultar(
    "UPDATE tarea SET archivada = ?, fecha_archivada = IF(? = 1, NOW(), NULL) WHERE id_tarea = ?",
    [archivada, archivada, id_tarea],
    connection,
  );

// ───────────── Orden dentro de la columna del tablero ─────────────

export const obtenerOrdenes = (ids, connection) =>
  consultar(
    `SELECT id_tarea, id_etarea, id_proyecto, orden FROM tarea
     WHERE id_tarea IN (${ids.map(() => "?").join(", ")}) AND habilita = 1`,
    ids,
    connection,
  );

export const actualizarOrden = (id_tarea, orden, connection) =>
  consultar("UPDATE tarea SET orden = ? WHERE id_tarea = ?", [orden, id_tarea], connection);

// ───────────── Historial de seguimiento (solo inserciones) ─────────────

export const insertarActualizacion = async (datos, connection) => {
  const resultado = await consultar(
    `INSERT INTO tarea_actualizacion
       (id_tarea, id_usuario, id_tactualizacion, id_etarea_anterior, id_etarea_nuevo, porcentaje_anterior, porcentaje_nuevo, comentario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.id_tarea,
      datos.id_usuario,
      datos.id_tactualizacion,
      datos.id_etarea_anterior ?? null,
      datos.id_etarea_nuevo ?? null,
      datos.porcentaje_anterior ?? null,
      datos.porcentaje_nuevo ?? null,
      datos.comentario ?? null,
    ],
    connection,
  );
  return resultado.insertId;
};

export const listarActualizaciones = (id_tarea) =>
  consultar(
    `SELECT
       a.id_tarea_actualizacion,
       a.id_tarea,
       a.id_usuario,
       ${nombreCompleto("p")} AS nombre_usuario,
       a.id_tactualizacion,
       ta.nombre_tactualizacion,
       a.id_etarea_anterior,
       ea.nombre_etarea AS nombre_etarea_anterior,
       a.id_etarea_nuevo,
       en.nombre_etarea AS nombre_etarea_nuevo,
       a.porcentaje_anterior,
       a.porcentaje_nuevo,
       a.comentario,
       a.fecha_alta
     FROM tarea_actualizacion a
     INNER JOIN tipo_actualizacion ta ON ta.id_tactualizacion = a.id_tactualizacion
     INNER JOIN usuario u ON u.id_usuario = a.id_usuario
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     LEFT JOIN estado_tarea ea ON ea.id_etarea = a.id_etarea_anterior
     LEFT JOIN estado_tarea en ON en.id_etarea = a.id_etarea_nuevo
     WHERE a.id_tarea = ?
     ORDER BY a.fecha_alta DESC, a.id_tarea_actualizacion DESC`,
    [id_tarea],
  );

// ───────────── Comentarios ─────────────

export const insertarComentario = async ({ id_tarea, id_usuario, comentario }, connection) => {
  const resultado = await consultar(
    "INSERT INTO tarea_comentario (id_tarea, id_usuario, comentario) VALUES (?, ?, ?)",
    [id_tarea, id_usuario, comentario],
    connection,
  );
  return resultado.insertId;
};

// A quién se etiquetó en el comentario (@usuario).
export const insertarMenciones = (id_tarea_comentario, ids_usuario, connection) =>
  consultar(
    `INSERT INTO tarea_comentario_mencion (id_tarea_comentario, id_usuario)
     VALUES ${ids_usuario.map(() => "(?, ?)").join(", ")}`,
    ids_usuario.flatMap((id_usuario) => [id_tarea_comentario, id_usuario]),
    connection,
  );

// Cada comentario trae `menciones: [{ id_usuario, nombre_usuario }]` para poder resaltarlas.
export const listarComentarios = async (id_tarea) => {
  const comentarios = await consultar(
    `SELECT
       c.id_tarea_comentario,
       c.id_tarea,
       c.id_usuario,
       ${nombreCompleto("p")} AS nombre_usuario,
       c.comentario,
       c.fecha_alta
     FROM tarea_comentario c
     INNER JOIN usuario u ON u.id_usuario = c.id_usuario
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     WHERE c.id_tarea = ? AND c.habilita = 1
     ORDER BY c.fecha_alta ASC, c.id_tarea_comentario ASC`,
    [id_tarea],
  );
  const menciones = await consultar(
    `SELECT m.id_tarea_comentario, u.id_usuario, ${nombreCompleto("p")} AS nombre_usuario
     FROM tarea_comentario_mencion m
     INNER JOIN tarea_comentario c ON c.id_tarea_comentario = m.id_tarea_comentario
     INNER JOIN usuario u ON u.id_usuario = m.id_usuario
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     WHERE c.id_tarea = ? AND c.habilita = 1`,
    [id_tarea],
  );
  return comentarios.map((comentario) => ({
    ...comentario,
    menciones: menciones
      .filter((mencion) => mencion.id_tarea_comentario === comentario.id_tarea_comentario)
      .map(({ id_usuario, nombre_usuario }) => ({ id_usuario, nombre_usuario })),
  }));
};

export const obtenerComentario = async (id_tarea_comentario) => {
  const filas = await consultar(
    "SELECT id_tarea_comentario, id_tarea, id_usuario FROM tarea_comentario WHERE id_tarea_comentario = ? AND habilita = 1 LIMIT 1",
    [id_tarea_comentario],
  );
  return filas[0] ?? null;
};

export const deshabilitarComentario = (id_tarea_comentario) =>
  consultar("UPDATE tarea_comentario SET habilita = 0 WHERE id_tarea_comentario = ?", [id_tarea_comentario]);
