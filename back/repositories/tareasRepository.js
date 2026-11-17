import { consultar, TABLA_PERSONA } from "../config/dbOrganizador.js";
import { filtroProyectosVisibles, limite } from "./visibilidad.js";
import { nombreCompleto } from "./usuariosRepository.js";

// `vencida` y `dias_para_vencer` se calculan en la base para que la fecha de "hoy" sea una sola.
const SELECT_TAREA = `
  SELECT
    t.id_tarea,
    t.id_proyecto,
    pr.nombre_proyecto,
    pr.archivado AS proyecto_archivado,
    t.titulo,
    t.descripcion,
    t.id_usuario_responsable,
    ${nombreCompleto("pres")} AS nombre_responsable,
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
  LEFT JOIN usuario ures ON ures.id_usuario = t.id_usuario_responsable
  LEFT JOIN ${TABLA_PERSONA} pres ON pres.id_persona = ures.id_persona
  LEFT JOIN usuario ucre ON ucre.id_usuario = t.id_usuario_alta
  LEFT JOIN ${TABLA_PERSONA} pcre ON pcre.id_persona = ucre.id_persona`;

export const listar = (usuario, filtros, diasProximas) => {
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
  if (filtros.id_usuario_responsable) agregar("t.id_usuario_responsable = ?", filtros.id_usuario_responsable);
  if (filtros.sin_responsable) condiciones.push("t.id_usuario_responsable IS NULL");
  if (filtros.id_etarea) agregar("t.id_etarea = ?", filtros.id_etarea);
  if (filtros.id_prioridad) agregar("t.id_prioridad = ?", filtros.id_prioridad);
  if (filtros.vence_desde) agregar("t.fecha_vencimiento >= ?", filtros.vence_desde);
  if (filtros.vence_hasta) agregar("t.fecha_vencimiento <= ?", filtros.vence_hasta);
  if (filtros.buscar) agregar("(t.titulo LIKE ? OR pr.nombre_proyecto LIKE ?)", `%${filtros.buscar}%`, `%${filtros.buscar}%`);

  if (filtros.vencimiento === "vencidas") {
    condiciones.push("et.es_final = 0 AND t.fecha_vencimiento < CURDATE()");
  } else if (filtros.vencimiento === "proximas") {
    agregar("et.es_final = 0 AND t.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)", diasProximas);
  }

  // El orden sale de una lista fija, nunca del texto que manda el cliente.
  const orden =
    filtros.ordenar === "vencimiento"
      ? "t.fecha_vencimiento IS NULL, t.fecha_vencimiento, pri.orden DESC, t.id_tarea"
      : "et.orden, t.orden, t.id_tarea";

  return consultar(
    `${SELECT_TAREA}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${orden}
     LIMIT ${limite(filtros.limite, 1000, 2000)}`,
    params,
  );
};

export const obtener = async (id_tarea, connection) => {
  const filas = await consultar(`${SELECT_TAREA} WHERE t.id_tarea = ? AND t.habilita = 1 LIMIT 1`, [id_tarea], connection);
  return filas[0] ?? null;
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
       (id_proyecto, titulo, descripcion, id_usuario_responsable, id_prioridad, id_etarea, porcentaje_avance,
        fecha_inicio, fecha_vencimiento, fecha_finalizacion, orden, id_usuario_alta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${datos.finalizada ? "NOW()" : "NULL"}, ?, ?)`,
    [
      datos.id_proyecto,
      datos.titulo,
      datos.descripcion,
      datos.id_usuario_responsable,
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
     SET titulo = ?, descripcion = ?, id_usuario_responsable = ?, id_prioridad = ?, fecha_inicio = ?, fecha_vencimiento = ?
     WHERE id_tarea = ?`,
    [datos.titulo, datos.descripcion, datos.id_usuario_responsable, datos.id_prioridad, datos.fecha_inicio, datos.fecha_vencimiento, id_tarea],
    connection,
  );

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

export const listarComentarios = (id_tarea) =>
  consultar(
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

export const obtenerComentario = async (id_tarea_comentario) => {
  const filas = await consultar(
    "SELECT id_tarea_comentario, id_tarea, id_usuario FROM tarea_comentario WHERE id_tarea_comentario = ? AND habilita = 1 LIMIT 1",
    [id_tarea_comentario],
  );
  return filas[0] ?? null;
};

export const deshabilitarComentario = (id_tarea_comentario) =>
  consultar("UPDATE tarea_comentario SET habilita = 0 WHERE id_tarea_comentario = ?", [id_tarea_comentario]);
