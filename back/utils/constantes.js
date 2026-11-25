// Ids de los catálogos. Coinciden con migrations/2026-11-17_002_datos_iniciales.sql.

// id_tusuario
export const ROLES = {
  ADMINISTRADOR: 1,
  SUPERVISOR: 2,
  COLABORADOR: 3,
};

// id_eproyecto
export const ESTADOS_PROYECTO = {
  PLANIFICACION: 1,
  ACTIVO: 2,
  PAUSADO: 3,
  FINALIZADO: 4,
};

// id_etarea
export const ESTADOS_TAREA = {
  PENDIENTE: 1,
  EN_PROGRESO: 2,
  EN_REVISION: 3,
  BLOQUEADA: 4,
  FINALIZADA: 5,
};

// id_prioridad
export const PRIORIDADES = {
  BAJA: 1,
  MEDIA: 2,
  ALTA: 3,
  URGENTE: 4,
};

// id_tactualizacion
export const TIPOS_ACTUALIZACION = {
  AVANCE: 1,
  NOVEDAD: 2,
  DIFICULTAD: 3,
  CAMBIO_ESTADO: 4,
};

// id_tnotificacion
export const TIPOS_NOTIFICACION = {
  TAREA_ASIGNADA: 1,
  TAREA_MODIFICADA: 2,
  COMENTARIO: 3,
  PROXIMA_A_VENCER: 4,
  CAMBIO_VENCIMIENTO: 5,
  AVANCE_REGISTRADO: 6,
  MENCION: 7,
};

// Códigos de registro_actividad.accion
export const ACCIONES = {
  PROYECTO_CREADO: "PROYECTO_CREADO",
  PROYECTO_EDITADO: "PROYECTO_EDITADO",
  PROYECTO_ARCHIVADO: "PROYECTO_ARCHIVADO",
  PROYECTO_DESARCHIVADO: "PROYECTO_DESARCHIVADO",
  INTEGRANTE_AGREGADO: "INTEGRANTE_AGREGADO",
  INTEGRANTE_QUITADO: "INTEGRANTE_QUITADO",
  TAREA_CREADA: "TAREA_CREADA",
  TAREA_EDITADA: "TAREA_EDITADA",
  TAREA_REASIGNADA: "TAREA_REASIGNADA",
  TAREA_ESTADO: "TAREA_ESTADO",
  TAREA_AVANCE: "TAREA_AVANCE",
  TAREA_NOVEDAD: "TAREA_NOVEDAD",
  TAREA_ARCHIVADA: "TAREA_ARCHIVADA",
  TAREA_DESARCHIVADA: "TAREA_DESARCHIVADA",
  COMENTARIO_AGREGADO: "COMENTARIO_AGREGADO",
  USUARIO_CREADO: "USUARIO_CREADO",
  USUARIO_EDITADO: "USUARIO_EDITADO",
};

// commit_recibido.resultado: qué se hizo con cada commit que avisó el hook.
export const RESULTADOS_COMMIT = {
  TAREA_CREADA: "TAREA_CREADA",
  TAREA_ACTUALIZADA: "TAREA_ACTUALIZADA", // el mensaje nombraba una tarea ("tarea #12"): se le registró una novedad
  TAREA_FINALIZADA: "TAREA_FINALIZADA", // además pedía cerrarla ("finaliza tarea #12"): quedó finalizada
  IGNORADO_MERGE: "IGNORADO_MERGE",
  // Pendientes: falta configurar algo. Se resuelven solos al reprocesar una vez que se configura.
  SIN_PROYECTO: "SIN_PROYECTO", // el repositorio no está vinculado a ningún proyecto
  SIN_USUARIO: "SIN_USUARIO", // el autor del commit no corresponde a ningún usuario habilitado
  PROYECTO_ARCHIVADO: "PROYECTO_ARCHIVADO",
};

export const RESULTADOS_COMMIT_PENDIENTES = [
  RESULTADOS_COMMIT.SIN_PROYECTO,
  RESULTADOS_COMMIT.SIN_USUARIO,
  RESULTADOS_COMMIT.PROYECTO_ARCHIVADO,
];

export const esAdmin = (usuario) => Number(usuario?.id_tusuario) === ROLES.ADMINISTRADOR;
export const esSupervisor = (usuario) => Number(usuario?.id_tusuario) === ROLES.SUPERVISOR;
// Administradores y supervisores: los que pueden crear proyectos y tareas.
export const esGestor = (usuario) => esAdmin(usuario) || esSupervisor(usuario);
