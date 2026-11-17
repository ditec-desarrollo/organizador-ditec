import { consultar, TABLA_PERSONA } from "../config/dbOrganizador.js";
import { filtroProyectosVisibles } from "./visibilidad.js";
import { nombreCompleto } from "./usuariosRepository.js";

// Proyecto + estado + creador + resumen de sus tareas (las archivadas no cuentan para el avance).
const SELECT_PROYECTO = `
  SELECT
    p.id_proyecto,
    p.nombre_proyecto,
    p.descripcion,
    p.fecha_inicio,
    p.fecha_fin_estimada,
    p.id_eproyecto,
    ep.nombre_eproyecto,
    p.archivado,
    p.fecha_archivado,
    p.id_usuario_alta,
    ${nombreCompleto("pc")} AS nombre_creador,
    p.fecha_alta,
    p.fecha_modificacion,
    COALESCE(r.total_tareas, 0) AS total_tareas,
    COALESCE(r.tareas_finalizadas, 0) AS tareas_finalizadas,
    COALESCE(r.tareas_vencidas, 0) AS tareas_vencidas,
    COALESCE(r.avance, 0) AS avance,
    (SELECT COUNT(*) FROM proyecto_integrante pi WHERE pi.id_proyecto = p.id_proyecto AND pi.habilita = 1) AS total_integrantes
  FROM proyecto p
  INNER JOIN estado_proyecto ep ON ep.id_eproyecto = p.id_eproyecto
  LEFT JOIN usuario uc ON uc.id_usuario = p.id_usuario_alta
  LEFT JOIN ${TABLA_PERSONA} pc ON pc.id_persona = uc.id_persona
  LEFT JOIN (
    SELECT
      t.id_proyecto,
      COUNT(*) AS total_tareas,
      SUM(et.es_final) AS tareas_finalizadas,
      SUM(et.es_final = 0 AND t.fecha_vencimiento < CURDATE()) AS tareas_vencidas,
      ROUND(AVG(t.porcentaje_avance)) AS avance
    FROM tarea t
    INNER JOIN estado_tarea et ON et.id_etarea = t.id_etarea
    WHERE t.habilita = 1 AND t.archivada = 0
    GROUP BY t.id_proyecto
  ) r ON r.id_proyecto = p.id_proyecto`;

// SUM() de MySQL vuelve como texto (DECIMAL): se normaliza a número.
const normalizar = (fila) =>
  fila && {
    ...fila,
    total_tareas: Number(fila.total_tareas),
    tareas_finalizadas: Number(fila.tareas_finalizadas),
    tareas_vencidas: Number(fila.tareas_vencidas),
    avance: Number(fila.avance),
    total_integrantes: Number(fila.total_integrantes),
  };

export const listar = async (usuario, { buscar, id_eproyecto, archivado }) => {
  const visibles = filtroProyectosVisibles(usuario, "p");
  const condiciones = ["p.habilita = 1", visibles.sql];
  const params = [...visibles.params];

  // Por defecto no se muestran los archivados.
  condiciones.push("p.archivado = ?");
  params.push(archivado ?? 0);

  if (id_eproyecto) {
    condiciones.push("p.id_eproyecto = ?");
    params.push(id_eproyecto);
  }
  if (buscar) {
    condiciones.push("p.nombre_proyecto LIKE ?");
    params.push(`%${buscar}%`);
  }

  const filas = await consultar(
    `${SELECT_PROYECTO}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ep.orden, p.nombre_proyecto`,
    params,
  );
  return filas.map(normalizar);
};

export const obtener = async (id_proyecto, connection) => {
  const filas = await consultar(
    `${SELECT_PROYECTO} WHERE p.id_proyecto = ? AND p.habilita = 1 LIMIT 1`,
    [id_proyecto],
    connection,
  );
  return normalizar(filas[0]) ?? null;
};

export const crear = async (datos, connection) => {
  const resultado = await consultar(
    `INSERT INTO proyecto (nombre_proyecto, descripcion, fecha_inicio, fecha_fin_estimada, id_eproyecto, id_usuario_alta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [datos.nombre_proyecto, datos.descripcion, datos.fecha_inicio, datos.fecha_fin_estimada, datos.id_eproyecto, datos.id_usuario_alta],
    connection,
  );
  return resultado.insertId;
};

export const actualizar = (id_proyecto, datos, connection) =>
  consultar(
    `UPDATE proyecto
     SET nombre_proyecto = ?, descripcion = ?, fecha_inicio = ?, fecha_fin_estimada = ?, id_eproyecto = ?
     WHERE id_proyecto = ?`,
    [datos.nombre_proyecto, datos.descripcion, datos.fecha_inicio, datos.fecha_fin_estimada, datos.id_eproyecto, id_proyecto],
    connection,
  );

export const archivar = (id_proyecto, archivado, connection) =>
  consultar(
    "UPDATE proyecto SET archivado = ?, fecha_archivado = IF(? = 1, NOW(), NULL) WHERE id_proyecto = ?",
    [archivado, archivado, id_proyecto],
    connection,
  );

// ───────────── Integrantes ─────────────

export const esIntegrante = async (id_proyecto, id_usuario, connection) => {
  const filas = await consultar(
    "SELECT 1 FROM proyecto_integrante WHERE id_proyecto = ? AND id_usuario = ? AND habilita = 1 LIMIT 1",
    [id_proyecto, id_usuario],
    connection,
  );
  return filas.length > 0;
};

export const listarIntegrantes = (id_proyecto) =>
  consultar(
    `SELECT
       u.id_usuario,
       u.id_tusuario,
       tu.nombre_tusuario,
       ${nombreCompleto("p")} AS nombre_usuario,
       p.email_persona,
       pi.fecha_alta,
       (SELECT COUNT(*) FROM tarea t
        INNER JOIN estado_tarea et ON et.id_etarea = t.id_etarea
        WHERE t.id_proyecto = pi.id_proyecto AND t.id_usuario_responsable = u.id_usuario
          AND t.habilita = 1 AND t.archivada = 0 AND et.es_final = 0) AS tareas_abiertas
     FROM proyecto_integrante pi
     INNER JOIN usuario u ON u.id_usuario = pi.id_usuario
     INNER JOIN tipo_usuario tu ON tu.id_tusuario = u.id_tusuario
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     WHERE pi.id_proyecto = ? AND pi.habilita = 1
     ORDER BY tu.id_tusuario, p.apellido_persona, p.nombre_persona`,
    [id_proyecto],
  );

// Alta de integrante. Si ya había sido integrante y se lo quitó, se lo vuelve a habilitar.
export const agregarIntegrante = (id_proyecto, id_usuario, id_usuario_alta, connection) =>
  consultar(
    `INSERT INTO proyecto_integrante (id_proyecto, id_usuario, id_usuario_alta)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE habilita = 1`,
    [id_proyecto, id_usuario, id_usuario_alta],
    connection,
  );

export const quitarIntegrante = (id_proyecto, id_usuario, connection) =>
  consultar("UPDATE proyecto_integrante SET habilita = 0 WHERE id_proyecto = ? AND id_usuario = ?", [id_proyecto, id_usuario], connection);

export const contarTareasAbiertasDe = async (id_proyecto, id_usuario, connection) => {
  const filas = await consultar(
    `SELECT COUNT(*) AS total
     FROM tarea t
     INNER JOIN estado_tarea et ON et.id_etarea = t.id_etarea
     WHERE t.id_proyecto = ? AND t.id_usuario_responsable = ?
       AND t.habilita = 1 AND t.archivada = 0 AND et.es_final = 0`,
    [id_proyecto, id_usuario],
    connection,
  );
  return filas[0].total;
};
