// Ids de tipo_usuario (los mismos que back/utils/constantes.js).
export const ROLES = {
  ADMINISTRADOR: 1,
  SUPERVISOR: 2,
  COLABORADOR: 3,
};

export const esAdmin = (usuario) => Number(usuario?.id_tusuario) === ROLES.ADMINISTRADOR;

// Administradores y supervisores: crean proyectos y tareas, y gestionan los proyectos que ven.
export const esGestor = (usuario) =>
  [ROLES.ADMINISTRADOR, ROLES.SUPERVISOR].includes(Number(usuario?.id_tusuario));

// Quién puede cambiar el estado y el avance de una tarea: quien gestiona o su responsable.
// Solo decide qué se muestra; el back vuelve a validar cada pedido.
export const puedeActualizarTarea = (usuario, tarea) =>
  tarea.archivada !== 1 &&
  tarea.proyecto_archivado !== 1 &&
  (esGestor(usuario) || tarea.id_usuario_responsable === usuario?.id_usuario);
