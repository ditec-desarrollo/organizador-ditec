import axios from "../config/axios";

// Todas las llamadas a la API, agrupadas por recurso. Cada función devuelve directamente los datos.
// Los filtros vacíos ("" / null) no se mandan.
const limpiar = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== "" && valor !== null && valor !== undefined));

const get = (url, params) => axios.get(url, { params: limpiar(params) }).then((r) => r.data);
const post = (url, datos) => axios.post(url, datos).then((r) => r.data);
const put = (url, datos) => axios.put(url, datos).then((r) => r.data);
const patch = (url, datos) => axios.patch(url, datos).then((r) => r.data);
const del = (url) => axios.delete(url).then((r) => r.data);

export const sesionApi = {
  estado: () => get("/usuarios/authStatus").then((datos) => datos.usuario),
  catalogos: () => get("/catalogos"),
  // `amplio`: más filas por lista (vista para televisión).
  dashboard: ({ amplio = false } = {}) => get("/dashboard", amplio ? { amplio: 1 } : undefined),
  actividad: (filtros) => get("/actividad", filtros),
};

export const usuariosApi = {
  listar: (filtros) => get("/usuarios", filtros),
  // Lista mínima (id y nombre) para etiquetar con @ en los comentarios.
  etiquetables: () => get("/usuarios/etiquetables"),
  // Personas de Ciudad Digital por N° de afiliado, nombre, apellido, CUIL o email: { personas, hay_mas }.
  buscarPersonas: (buscar) => get("/usuarios/personas", { buscar }),
  crear: (datos) => post("/usuarios", datos),
  actualizar: (id_usuario, datos) => put(`/usuarios/${id_usuario}`, datos),
  // Con qué nombre o email firma sus commits (para atribuirle las tareas que generan).
  aliasGit: (id_usuario) => get(`/usuarios/${id_usuario}/alias-git`),
  agregarAliasGit: (id_usuario, alias) => post(`/usuarios/${id_usuario}/alias-git`, { alias }),
  quitarAliasGit: (id_usuario, id_usuario_alias_git) => del(`/usuarios/${id_usuario}/alias-git/${id_usuario_alias_git}`),
};

export const proyectosApi = {
  listar: (filtros) => get("/proyectos", filtros),
  obtener: (id_proyecto) => get(`/proyectos/${id_proyecto}`),
  crear: (datos) => post("/proyectos", datos),
  actualizar: (id_proyecto, datos) => put(`/proyectos/${id_proyecto}`, datos),
  archivar: (id_proyecto, archivado) => patch(`/proyectos/${id_proyecto}/archivar`, { archivado }),
  integrantes: (id_proyecto) => get(`/proyectos/${id_proyecto}/integrantes`),
  agregarIntegrante: (id_proyecto, id_usuario) => post(`/proyectos/${id_proyecto}/integrantes`, { id_usuario }),
  marcarResponsable: (id_proyecto, id_usuario, es_responsable) =>
    patch(`/proyectos/${id_proyecto}/integrantes/${id_usuario}`, { es_responsable }),
  quitarIntegrante: (id_proyecto, id_usuario) => del(`/proyectos/${id_proyecto}/integrantes/${id_usuario}`),
  // Repositorios de git cuyos commits generan tareas en el proyecto.
  vincularRepositorio: (id_proyecto, repositorio) => post(`/proyectos/${id_proyecto}/repositorios`, { repositorio }),
  desvincularRepositorio: (id_proyecto, id_proyecto_repositorio) =>
    del(`/proyectos/${id_proyecto}/repositorios/${id_proyecto_repositorio}`),
};

export const tareasApi = {
  listar: (filtros) => get("/tareas", filtros),
  obtener: (id_tarea) => get(`/tareas/${id_tarea}`),
  crear: (datos) => post("/tareas", datos),
  actualizar: (id_tarea, datos) => put(`/tareas/${id_tarea}`, datos),
  archivar: (id_tarea, archivada) => patch(`/tareas/${id_tarea}/archivar`, { archivada }),
  mover: (id_tarea, datos) => patch(`/tareas/${id_tarea}/mover`, datos),
  actualizaciones: (id_tarea) => get(`/tareas/${id_tarea}/actualizaciones`),
  registrarActualizacion: (id_tarea, datos) => post(`/tareas/${id_tarea}/actualizaciones`, datos),
  comentarios: (id_tarea) => get(`/tareas/${id_tarea}/comentarios`),
  // datos: { comentario, ids_mencionados }
  comentar: (id_tarea, datos) => post(`/tareas/${id_tarea}/comentarios`, datos),
  eliminarComentario: (id_tarea, id_tarea_comentario) => del(`/tareas/${id_tarea}/comentarios/${id_tarea_comentario}`),
};

// Commits que avisó el hook de Claude Code (solo administradores).
export const integracionesApi = {
  commits: (filtros) => get("/integraciones/commits", filtros),
  // Vuelve a intentar con los pendientes: { revisados, tareas_creadas, tareas_actualizadas, siguen_pendientes, con_error }.
  reprocesar: () => post("/integraciones/commits/reprocesar"),
};

export const notificacionesApi = {
  listar: (filtros) => get("/notificaciones", filtros),
  resumen: () => get("/notificaciones/resumen"),
  marcarLeida: (id_notificacion) => patch(`/notificaciones/${id_notificacion}/leida`),
  marcarTodas: () => patch("/notificaciones/leidas"),
};
