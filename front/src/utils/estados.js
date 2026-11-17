// Color de cada valor de los catálogos, por id. Los nombres salen del back (GET /catalogos);
// acá solo se elige una de las clases .org-color--* de styles/organizador.css.

const COLOR_ESTADO_TAREA = { 1: "gris", 2: "azul", 3: "violeta", 4: "rojo", 5: "verde" };
const COLOR_PRIORIDAD = { 1: "gris", 2: "azul", 3: "naranja", 4: "rojo" };
const COLOR_ESTADO_PROYECTO = { 1: "violeta", 2: "verde", 3: "naranja", 4: "gris" };
// tipo_actualizacion: avance, novedad, dificultad, cambio de estado
const COLOR_ACTUALIZACION = { 1: "verde", 2: "azul", 3: "rojo", 4: "violeta" };

const clase = (mapa, id) => `org-color--${mapa[id] ?? "gris"}`;

export const claseEstadoTarea = (id_etarea) => clase(COLOR_ESTADO_TAREA, id_etarea);
export const clasePrioridad = (id_prioridad) => clase(COLOR_PRIORIDAD, id_prioridad);
export const claseEstadoProyecto = (id_eproyecto) => clase(COLOR_ESTADO_PROYECTO, id_eproyecto);
export const claseActualizacion = (id_tactualizacion) => clase(COLOR_ACTUALIZACION, id_tactualizacion);

export const TIPOS_ACTUALIZACION = { AVANCE: 1, NOVEDAD: 2, DIFICULTAD: 3, CAMBIO_ESTADO: 4 };
