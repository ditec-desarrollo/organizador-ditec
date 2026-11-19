import { consultar, TABLA_PERSONA } from "../config/dbOrganizador.js";
import { limite } from "./visibilidad.js";
import { nombreCompleto } from "./usuariosRepository.js";
import { TIPOS_NOTIFICACION } from "../utils/constantes.js";

export const crear = (datos, connection) =>
  consultar(
    `INSERT INTO notificacion (id_usuario, id_tnotificacion, id_tarea, id_proyecto, id_usuario_origen, texto)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.id_usuario, datos.id_tnotificacion, datos.id_tarea ?? null, datos.id_proyecto ?? null, datos.id_usuario_origen ?? null, datos.texto],
    connection,
  );

export const listar = (id_usuario, { soloNoLeidas = false, cantidad } = {}) =>
  consultar(
    `SELECT
       n.id_notificacion,
       n.id_tnotificacion,
       tn.nombre_tnotificacion,
       n.id_tarea,
       n.id_proyecto,
       n.id_usuario_origen,
       ${nombreCompleto("p")} AS nombre_origen,
       n.texto,
       n.leida,
       n.fecha_lectura,
       n.fecha_alta
     FROM notificacion n
     INNER JOIN tipo_notificacion tn ON tn.id_tnotificacion = n.id_tnotificacion
     LEFT JOIN usuario u ON u.id_usuario = n.id_usuario_origen
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     WHERE n.id_usuario = ? ${soloNoLeidas ? "AND n.leida = 0" : ""}
     ORDER BY n.fecha_alta DESC, n.id_notificacion DESC
     LIMIT ${limite(cantidad, 50, 200)}`,
    [id_usuario],
  );

export const contarNoLeidas = async (id_usuario) => {
  const filas = await consultar("SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = ? AND leida = 0", [id_usuario]);
  return filas[0].total;
};

// El id_usuario en el WHERE garantiza que nadie marque notificaciones ajenas.
export const marcarLeida = async (id_notificacion, id_usuario) => {
  const resultado = await consultar(
    "UPDATE notificacion SET leida = 1, fecha_lectura = NOW() WHERE id_notificacion = ? AND id_usuario = ? AND leida = 0",
    [id_notificacion, id_usuario],
  );
  return resultado.affectedRows;
};

export const existe = async (id_notificacion, id_usuario) => {
  const filas = await consultar("SELECT 1 FROM notificacion WHERE id_notificacion = ? AND id_usuario = ? LIMIT 1", [id_notificacion, id_usuario]);
  return filas.length > 0;
};

export const marcarTodasLeidas = async (id_usuario) => {
  const resultado = await consultar("UPDATE notificacion SET leida = 1, fecha_lectura = NOW() WHERE id_usuario = ? AND leida = 0", [id_usuario]);
  return resultado.affectedRows;
};

// Avisa a cada responsable de cada tarea abierta que vence dentro de `dias` días (o que ya venció).
// fecha_referencia guarda el vencimiento avisado: no se repite el aviso salvo que la fecha cambie.
export const generarAvisosDeVencimiento = async (dias, connection) => {
  const resultado = await consultar(
    `INSERT INTO notificacion (id_usuario, id_tnotificacion, id_tarea, id_proyecto, texto, fecha_referencia)
     SELECT
       tr.id_usuario,
       ?,
       t.id_tarea,
       t.id_proyecto,
       LEFT(CONCAT(
         CASE
           WHEN t.fecha_vencimiento < CURDATE() THEN 'Venció la tarea "'
           WHEN t.fecha_vencimiento = CURDATE() THEN 'Vence hoy la tarea "'
           ELSE 'Está por vencer la tarea "'
         END,
         t.titulo, '" (', DATE_FORMAT(t.fecha_vencimiento, '%d/%m/%Y'), ')'
       ), 255),
       t.fecha_vencimiento
     FROM tarea t
     INNER JOIN estado_tarea et ON et.id_etarea = t.id_etarea
     INNER JOIN proyecto pr ON pr.id_proyecto = t.id_proyecto
     INNER JOIN tarea_responsable tr ON tr.id_tarea = t.id_tarea AND tr.habilita = 1
     INNER JOIN usuario u ON u.id_usuario = tr.id_usuario AND u.habilita = 1
     WHERE t.habilita = 1 AND t.archivada = 0 AND et.es_final = 0
       AND pr.habilita = 1 AND pr.archivado = 0
       AND t.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND NOT EXISTS (
         SELECT 1 FROM notificacion n
         WHERE n.id_tarea = t.id_tarea
           AND n.id_usuario = tr.id_usuario
           AND n.id_tnotificacion = ?
           AND n.fecha_referencia = t.fecha_vencimiento
       )`,
    [TIPOS_NOTIFICACION.PROXIMA_A_VENCER, dias, TIPOS_NOTIFICACION.PROXIMA_A_VENCER],
    connection,
  );
  return resultado.affectedRows;
};
