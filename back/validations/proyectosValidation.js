import { Validador } from "../utils/validador.js";
import { ESTADOS_PROYECTO } from "../utils/constantes.js";

const IDS_ESTADO = Object.values(ESTADOS_PROYECTO);

export const filtrosProyecto = (query) => {
  const v = new Validador(query);
  const filtros = {
    buscar: v.texto("buscar", { max: 100 }),
    id_eproyecto: v.opcion("id_eproyecto", IDS_ESTADO),
    archivado: v.booleano("archivado"),
  };
  v.verificar();
  return filtros;
};

export const datosProyecto = (body) => {
  const v = new Validador(body);
  const datos = {
    nombre_proyecto: v.texto("nombre_proyecto", { requerido: true, min: 3, max: 150 }),
    descripcion: v.texto("descripcion", { max: 5000 }),
    fecha_inicio: v.fecha("fecha_inicio"),
    fecha_fin_estimada: v.fecha("fecha_fin_estimada"),
    id_eproyecto: v.opcion("id_eproyecto", IDS_ESTADO, { requerido: true }),
  };
  // "AAAA-MM-DD" se compara bien como texto.
  if (datos.fecha_inicio && datos.fecha_fin_estimada && datos.fecha_fin_estimada < datos.fecha_inicio) {
    v.error("fecha_fin_estimada", "No puede ser anterior a la fecha de inicio");
  }
  v.verificar();
  return datos;
};

export const datosArchivar = (body, campo) => {
  const v = new Validador(body);
  const valor = v.booleano(campo, { requerido: true });
  v.verificar();
  return valor;
};

export const datosIntegrante = (body) => {
  const v = new Validador(body);
  const id_usuario = v.entero("id_usuario", { requerido: true });
  v.verificar();
  return id_usuario;
};
