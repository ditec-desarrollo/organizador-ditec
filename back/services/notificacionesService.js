import * as notificacionesRepository from "../repositories/notificacionesRepository.js";
import { noEncontrado } from "../utils/customError.js";
import { env } from "../config/env.js";

// Crea la misma notificación para varios destinatarios. Nunca se le avisa a quien hizo la acción,
// ni dos veces a la misma persona.
export const notificar = async ({ destinatarios, id_usuario_origen, id_tnotificacion, id_tarea, id_proyecto, texto }, connection) => {
  const unicos = [...new Set(destinatarios)].filter((id_usuario) => id_usuario && id_usuario !== id_usuario_origen);
  for (const id_usuario of unicos) {
    await notificacionesRepository.crear(
      { id_usuario, id_tnotificacion, id_tarea, id_proyecto, id_usuario_origen, texto: String(texto).slice(0, 255) },
      connection,
    );
  }
};

export const listar = (usuario, filtros) =>
  notificacionesRepository.listar(usuario.id_usuario, { soloNoLeidas: filtros.solo_no_leidas === 1, cantidad: filtros.cantidad });

export const resumen = async (usuario) => ({
  no_leidas: await notificacionesRepository.contarNoLeidas(usuario.id_usuario),
});

export const marcarLeida = async (usuario, id_notificacion) => {
  if (!(await notificacionesRepository.existe(id_notificacion, usuario.id_usuario))) {
    throw noEncontrado("La notificación no existe");
  }
  await notificacionesRepository.marcarLeida(id_notificacion, usuario.id_usuario);
};

export const marcarTodasLeidas = (usuario) => notificacionesRepository.marcarTodasLeidas(usuario.id_usuario);

export const generarAvisosDeVencimiento = () => notificacionesRepository.generarAvisosDeVencimiento(env.diasAvisoVencimiento);
