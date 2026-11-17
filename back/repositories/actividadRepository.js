import { consultar, TABLA_PERSONA } from "../config/dbOrganizador.js";
import { filtroProyectosVisibles, limite } from "./visibilidad.js";
import { nombreCompleto } from "./usuariosRepository.js";
import { esAdmin } from "../utils/constantes.js";

export const registrar = ({ id_usuario, accion, id_proyecto, id_tarea, descripcion }, connection) =>
  consultar(
    "INSERT INTO registro_actividad (id_usuario, accion, id_proyecto, id_tarea, descripcion) VALUES (?, ?, ?, ?, ?)",
    [id_usuario, accion, id_proyecto ?? null, id_tarea ?? null, String(descripcion).slice(0, 255)],
    connection,
  );

export const listar = (usuario, { id_proyecto, id_tarea, id_usuario, cantidad } = {}) => {
  const condiciones = [];
  const params = [];

  // La actividad sin proyecto (alta de usuarios) solo la ve el administrador.
  if (!esAdmin(usuario)) {
    const visibles = filtroProyectosVisibles(usuario, "a");
    condiciones.push(`a.id_proyecto IS NOT NULL AND ${visibles.sql}`);
    params.push(...visibles.params);
  }
  if (id_proyecto) {
    condiciones.push("a.id_proyecto = ?");
    params.push(id_proyecto);
  }
  if (id_tarea) {
    condiciones.push("a.id_tarea = ?");
    params.push(id_tarea);
  }
  if (id_usuario) {
    condiciones.push("a.id_usuario = ?");
    params.push(id_usuario);
  }

  return consultar(
    `SELECT
       a.id_registro_actividad,
       a.id_usuario,
       ${nombreCompleto("p")} AS nombre_usuario,
       a.accion,
       a.id_proyecto,
       pr.nombre_proyecto,
       a.id_tarea,
       t.titulo AS titulo_tarea,
       a.descripcion,
       a.fecha_alta
     FROM registro_actividad a
     INNER JOIN usuario u ON u.id_usuario = a.id_usuario
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     LEFT JOIN proyecto pr ON pr.id_proyecto = a.id_proyecto
     LEFT JOIN tarea t ON t.id_tarea = a.id_tarea
     ${condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : ""}
     ORDER BY a.fecha_alta DESC, a.id_registro_actividad DESC
     LIMIT ${limite(cantidad, 30, 200)}`,
    params,
  );
};
