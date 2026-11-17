import * as proyectosRepository from "../repositories/proyectosRepository.js";
import * as tareasRepository from "../repositories/tareasRepository.js";
import { conflicto, noAutorizado, noEncontrado } from "../utils/customError.js";
import { esAdmin, esSupervisor } from "../utils/constantes.js";

// Reglas de acceso, en un solo lugar:
//   · Administrador: ve y gestiona todo.
//   · Supervisor: ve y gestiona los proyectos en los que es integrante (queda como integrante al crearlos).
//   · Colaborador: ve los proyectos en los que es integrante; solo actualiza las tareas que tiene asignadas.

// Trae el proyecto y qué puede hacer el usuario con él. Corta con 404 si no existe y con 403 si no lo puede ver.
export const accesoAProyecto = async (usuario, id_proyecto, connection) => {
  const proyecto = await proyectosRepository.obtener(id_proyecto, connection);
  if (!proyecto) throw noEncontrado("El proyecto no existe");

  const integrante = esAdmin(usuario) ? true : await proyectosRepository.esIntegrante(id_proyecto, usuario.id_usuario, connection);
  if (!integrante) throw noAutorizado("No tenés acceso a este proyecto");

  return { proyecto, puedeGestionar: esAdmin(usuario) || esSupervisor(usuario) };
};

export const exigirGestionDeProyecto = async (usuario, id_proyecto, connection) => {
  const acceso = await accesoAProyecto(usuario, id_proyecto, connection);
  if (!acceso.puedeGestionar) throw noAutorizado("No tenés permiso para gestionar este proyecto");
  return acceso;
};

// Trae la tarea y qué puede hacer el usuario con ella.
//   puedeGestionar  -> editar datos, reasignar, archivar
//   puedeActualizar -> cambiar estado y avance, registrar novedades (quien gestiona o el responsable)
export const accesoATarea = async (usuario, id_tarea, connection) => {
  const tarea = await tareasRepository.obtener(id_tarea, connection);
  if (!tarea) throw noEncontrado("La tarea no existe");

  const { proyecto, puedeGestionar } = await accesoAProyecto(usuario, tarea.id_proyecto, connection);
  const esResponsable = tarea.id_usuario_responsable === usuario.id_usuario;

  return { tarea, proyecto, puedeGestionar, puedeActualizar: puedeGestionar || esResponsable };
};

// Un proyecto archivado (o una tarea archivada) queda solo de consulta.
export const exigirProyectoActivo = (proyecto) => {
  if (proyecto.archivado === 1) throw conflicto("El proyecto está archivado: desarchivalo para hacer cambios");
};

export const exigirTareaActiva = (tarea) => {
  if (tarea.archivada === 1) throw conflicto("La tarea está archivada: desarchivala para hacer cambios");
};
