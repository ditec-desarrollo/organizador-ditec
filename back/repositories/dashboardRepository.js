import { consultar } from "../config/dbOrganizador.js";
import { filtroProyectosVisibles } from "./visibilidad.js";
import { ESTADOS_PROYECTO, ESTADOS_TAREA } from "../utils/constantes.js";

// Contadores de tareas abiertas/finalizadas.
// `soloMias`: cuenta solo las tareas donde el usuario es responsable (panel del colaborador);
// si no, todas las de los proyectos que puede ver (panel de administradores y supervisores).
export const resumenTareas = async (usuario, { soloMias, diasProximas }) => {
  const visibles = filtroProyectosVisibles(usuario, "t");
  const params = [
    ESTADOS_TAREA.PENDIENTE,
    ESTADOS_TAREA.EN_PROGRESO,
    ESTADOS_TAREA.EN_REVISION,
    ESTADOS_TAREA.BLOQUEADA,
    diasProximas,
    ...visibles.params,
  ];
  if (soloMias) params.push(usuario.id_usuario);

  const filas = await consultar(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(t.id_etarea = ?), 0) AS pendientes,
       COALESCE(SUM(t.id_etarea = ?), 0) AS en_progreso,
       COALESCE(SUM(t.id_etarea = ?), 0) AS en_revision,
       COALESCE(SUM(t.id_etarea = ?), 0) AS bloqueadas,
       COALESCE(SUM(et.es_final), 0) AS finalizadas,
       COALESCE(SUM(et.es_final = 0 AND t.fecha_vencimiento < CURDATE()), 0) AS vencidas,
       COALESCE(SUM(et.es_final = 0 AND t.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)), 0) AS proximas_a_vencer
     FROM tarea t
     INNER JOIN estado_tarea et ON et.id_etarea = t.id_etarea
     INNER JOIN proyecto pr ON pr.id_proyecto = t.id_proyecto
     WHERE t.habilita = 1 AND t.archivada = 0 AND pr.habilita = 1 AND pr.archivado = 0
       AND ${visibles.sql}
       ${soloMias ? "AND t.id_usuario_responsable = ?" : ""}`,
    params,
  );

  // SUM() vuelve como texto (DECIMAL): se pasa todo a número.
  return Object.fromEntries(Object.entries(filas[0]).map(([clave, valor]) => [clave, Number(valor)]));
};

export const contarProyectosActivos = async (usuario) => {
  const visibles = filtroProyectosVisibles(usuario, "p");
  const filas = await consultar(
    `SELECT COUNT(*) AS total
     FROM proyecto p
     WHERE p.habilita = 1 AND p.archivado = 0 AND p.id_eproyecto = ? AND ${visibles.sql}`,
    [ESTADOS_PROYECTO.ACTIVO, ...visibles.params],
  );
  return filas[0].total;
};
