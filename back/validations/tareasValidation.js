import { Validador } from "../utils/validador.js";
import { ESTADOS_TAREA, PRIORIDADES, TIPOS_ACTUALIZACION } from "../utils/constantes.js";

const IDS_ESTADO = Object.values(ESTADOS_TAREA);
const IDS_PRIORIDAD = Object.values(PRIORIDADES);
// "Cambio de estado" no se elige a mano: lo registra el tablero al mover una tarjeta.
const TIPOS_MANUALES = [TIPOS_ACTUALIZACION.AVANCE, TIPOS_ACTUALIZACION.NOVEDAD, TIPOS_ACTUALIZACION.DIFICULTAD];

export const filtrosTarea = (query) => {
  const v = new Validador(query);
  const filtros = {
    id_proyecto: v.entero("id_proyecto"),
    id_usuario_responsable: v.entero("id_usuario_responsable"),
    sin_responsable: v.booleano("sin_responsable"),
    mias: v.booleano("mias"),
    id_etarea: v.opcion("id_etarea", IDS_ESTADO),
    id_prioridad: v.opcion("id_prioridad", IDS_PRIORIDAD),
    vence_desde: v.fecha("vence_desde"),
    vence_hasta: v.fecha("vence_hasta"),
    vencimiento: v.texto("vencimiento", { max: 20 }),
    ordenar: v.texto("ordenar", { max: 20 }),
    buscar: v.texto("buscar", { max: 100 }),
    archivada: v.booleano("archivada"),
    limite: v.entero("limite", { max: 2000 }),
  };
  if (filtros.vencimiento && !["vencidas", "proximas"].includes(filtros.vencimiento)) {
    v.error("vencimiento", "Tiene que ser 'vencidas' o 'proximas'");
  }
  if (filtros.ordenar && !["tablero", "vencimiento"].includes(filtros.ordenar)) {
    v.error("ordenar", "Tiene que ser 'tablero' o 'vencimiento'");
  }
  v.verificar();
  return filtros;
};

// Datos generales de la tarea: los mismos para el alta y la edición.
const datosGenerales = (v) => {
  const datos = {
    titulo: v.texto("titulo", { requerido: true, min: 3, max: 200 }),
    descripcion: v.texto("descripcion", { max: 5000 }),
    // Puede no tener ninguno ("sin asignar") o varios.
    ids_responsables: v.listaDeEnteros("ids_responsables", { max: 30 }) ?? [],
    id_prioridad: v.opcion("id_prioridad", IDS_PRIORIDAD, { requerido: true }),
    fecha_inicio: v.fecha("fecha_inicio"),
    fecha_vencimiento: v.fecha("fecha_vencimiento"),
  };
  if (datos.fecha_inicio && datos.fecha_vencimiento && datos.fecha_vencimiento < datos.fecha_inicio) {
    v.error("fecha_vencimiento", "No puede ser anterior a la fecha de inicio");
  }
  return datos;
};

export const datosTareaNueva = (body) => {
  const v = new Validador(body);
  const datos = {
    id_proyecto: v.entero("id_proyecto", { requerido: true }),
    ...datosGenerales(v),
    id_etarea: v.opcion("id_etarea", IDS_ESTADO),
    porcentaje_avance: v.entero("porcentaje_avance", { min: 0, max: 100 }),
  };
  v.verificar();
  return datos;
};

export const datosTarea = (body) => {
  const v = new Validador(body);
  const datos = datosGenerales(v);
  v.verificar();
  return datos;
};

export const datosActualizacion = (body) => {
  const v = new Validador(body);
  const datos = {
    id_tactualizacion: v.opcion("id_tactualizacion", TIPOS_MANUALES, { requerido: true }),
    id_etarea: v.opcion("id_etarea", IDS_ESTADO),
    porcentaje_avance: v.entero("porcentaje_avance", { min: 0, max: 100 }),
    comentario: v.texto("comentario", { max: 5000 }),
  };
  // Una novedad o una dificultad sin explicación no le sirve a nadie.
  if (datos.id_tactualizacion !== TIPOS_ACTUALIZACION.AVANCE && !datos.comentario) {
    v.error("comentario", "Contá qué pasó");
  }
  v.verificar();
  return datos;
};

export const datosMover = (body) => {
  const v = new Validador(body);
  const datos = {
    id_etarea: v.opcion("id_etarea", IDS_ESTADO, { requerido: true }),
    ids_columna: v.listaDeEnteros("ids_columna"),
  };
  v.verificar();
  return datos;
};

// ids_mencionados: usuarios etiquetados con @ en el texto (opcional).
export const datosComentario = (body) => {
  const v = new Validador(body);
  const datos = {
    comentario: v.texto("comentario", { requerido: true, max: 5000 }),
    ids_mencionados: v.listaDeEnteros("ids_mencionados", { max: 30 }) ?? [],
  };
  v.verificar();
  return datos;
};

export const filtrosActividad = (query) => {
  const v = new Validador(query);
  const filtros = {
    id_proyecto: v.entero("id_proyecto"),
    id_tarea: v.entero("id_tarea"),
    id_usuario: v.entero("id_usuario"),
    cantidad: v.entero("cantidad", { max: 200 }),
  };
  v.verificar();
  return filtros;
};

export const filtrosNotificacion = (query) => {
  const v = new Validador(query);
  const filtros = {
    solo_no_leidas: v.booleano("solo_no_leidas"),
    cantidad: v.entero("cantidad", { max: 200 }),
  };
  v.verificar();
  return filtros;
};
