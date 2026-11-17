import { Validador } from "../utils/validador.js";
import { ROLES } from "../utils/constantes.js";

const IDS_ROL = Object.values(ROLES);

export const filtrosUsuario = (query) => {
  const v = new Validador(query);
  const filtros = { solo_habilitados: v.booleano("solo_habilitados") };
  v.verificar();
  return filtros;
};

// documento_persona guarda el CUIL: 11 dígitos, sin guiones.
export const documentoDePersona = (params) => {
  const v = new Validador(params);
  const documento = v.texto("documento", { requerido: true, max: 11 });
  if (documento !== null && !/^\d{11}$/.test(documento)) v.error("documento", "El CUIL tiene que tener 11 números, sin guiones");
  v.verificar();
  return documento;
};

export const datosUsuarioNuevo = (body) => {
  const v = new Validador(body);
  const datos = {
    id_persona: v.entero("id_persona", { requerido: true }),
    id_tusuario: v.opcion("id_tusuario", IDS_ROL, { requerido: true }),
  };
  v.verificar();
  return datos;
};

export const datosUsuario = (body) => {
  const v = new Validador(body);
  const datos = {
    id_tusuario: v.opcion("id_tusuario", IDS_ROL, { requerido: true }),
    habilita: v.booleano("habilita", { requerido: true }),
  };
  v.verificar();
  return datos;
};
