import * as usuariosRepository from "../repositories/usuariosRepository.js";
import * as actividadRepository from "../repositories/actividadRepository.js";
import { conflicto, noEncontrado } from "../utils/customError.js";
import { ACCIONES, ROLES } from "../utils/constantes.js";

const nombreDe = (persona) => `${persona.nombre_persona ?? ""} ${persona.apellido_persona ?? ""}`.trim();

// Datos de la sesión: la persona de Ciudad Digital + su usuario del Organizador.
// Si la persona existe pero no fue dada de alta acá (o está deshabilitada), id_usuario vuelve en null
// y el front muestra la pantalla "sin acceso".
export const estadoDeSesion = async (id_persona) => {
  const persona = await usuariosRepository.obtenerPersona(id_persona);
  if (!persona) return null;

  const usuario = await usuariosRepository.buscarPorPersona(id_persona);
  const habilitado = usuario?.habilita === 1;

  return {
    ...persona,
    id_usuario: habilitado ? usuario.id_usuario : null,
    id_tusuario: habilitado ? usuario.id_tusuario : null,
    nombre_tusuario: habilitado ? usuario.nombre_tusuario : null,
  };
};

export const listar = (filtros) => usuariosRepository.listar({ soloHabilitados: filtros.solo_habilitados === 1 });

// Usuarios que se pueden etiquetar en un comentario (solo id y nombre).
export const listarEtiquetables = () => usuariosRepository.listarEtiquetables();

// Busca una persona de Ciudad Digital por CUIL para darla de alta como usuario.
export const buscarPersona = async (documento) => {
  const persona = await usuariosRepository.buscarPersonaPorDocumento(documento);
  if (!persona) throw noEncontrado("No hay ninguna persona registrada en Ciudad Digital con ese CUIL");

  const usuario = await usuariosRepository.buscarPorPersona(persona.id_persona);
  return { ...persona, ya_registrado: Boolean(usuario) };
};

export const crear = async (actor, { id_persona, id_tusuario }) => {
  const persona = await usuariosRepository.obtenerPersona(id_persona);
  if (!persona) throw noEncontrado("La persona no existe en Ciudad Digital");
  if (await usuariosRepository.buscarPorPersona(id_persona)) throw conflicto("Esa persona ya es usuaria del Organizador");

  const id_usuario = await usuariosRepository.crear({ id_persona, id_tusuario, id_usuario_alta: actor.id_usuario });
  await actividadRepository.registrar({
    id_usuario: actor.id_usuario,
    accion: ACCIONES.USUARIO_CREADO,
    descripcion: `dio de alta a ${nombreDe(persona)}`,
  });
  return usuariosRepository.obtener(id_usuario);
};

export const actualizar = async (actor, id_usuario, { id_tusuario, habilita }) => {
  const usuario = await usuariosRepository.obtener(id_usuario);
  if (!usuario) throw noEncontrado("El usuario no existe");

  // Siempre tiene que quedar al menos un administrador habilitado, o nadie podría gestionar usuarios.
  const dejaDeSerAdmin = usuario.id_tusuario === ROLES.ADMINISTRADOR && usuario.habilita === 1 && (id_tusuario !== ROLES.ADMINISTRADOR || habilita === 0);
  if (dejaDeSerAdmin && (await usuariosRepository.contarAdministradoresHabilitados(ROLES.ADMINISTRADOR)) <= 1) {
    throw conflicto("Tiene que quedar al menos un administrador habilitado");
  }

  await usuariosRepository.actualizar(id_usuario, { id_tusuario, habilita });
  await actividadRepository.registrar({
    id_usuario: actor.id_usuario,
    accion: ACCIONES.USUARIO_EDITADO,
    descripcion: `${habilita === 1 ? "modificó" : "deshabilitó"} al usuario ${nombreDe(usuario)}`,
  });
  return usuariosRepository.obtener(id_usuario);
};
