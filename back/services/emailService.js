import nodemailer from "nodemailer";
import * as usuariosRepository from "../repositories/usuariosRepository.js";
import { armarEmailDeMencion, esEmailValido } from "../utils/emailMencion.js";
import { env } from "../config/env.js";

// Misma cuenta y configuración que el back de Ciudad Digital. Se crea recién con el primer envío.
let transporte;
const obtenerTransporte = () => {
  transporte ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.email.usuario, pass: env.email.password },
  });
  return transporte;
};

// Nunca lanza: un mail que no sale no tiene que romper lo que el usuario estaba haciendo.
export const enviarEmail = async ({ para, asunto, texto, html }) => {
  if (!env.email.activo) return false;
  try {
    await obtenerTransporte().sendMail({
      from: { name: env.email.remitente, address: env.email.usuario },
      to: para,
      subject: asunto,
      text: texto,
      html,
    });
    return true;
  } catch (error) {
    console.error(`No se pudo enviar el email "${asunto}": ${error.message}`);
    return false;
  }
};

// Mail a cada etiquetado en un comentario. Se llama DESPUÉS de confirmar la transacción y sin await:
// la notificación interna ya quedó guardada, y un SMTP lento o caído no demora ni hace fallar el comentario.
// No se le escribe a quien comentó, ni a quien no tiene un email válido en Ciudad Digital.
export const enviarEmailsDeMencion = async ({ id_usuario_origen, ids_mencionados, id_tarea, titulo, proyecto, comentario }) => {
  if (!env.email.activo) return 0;
  try {
    const destinatarios = [...new Set(ids_mencionados)].filter((id) => id !== id_usuario_origen);
    if (destinatarios.length === 0) return 0;

    const usuarios = await usuariosRepository.obtenerParaEmail([...destinatarios, id_usuario_origen]);
    const autor = usuarios.find((u) => u.id_usuario === id_usuario_origen)?.nombre_usuario;
    const email = armarEmailDeMencion({ autor, id_tarea, titulo, proyecto, comentario, urlFront: env.urlFront });

    // Un mail por persona: así nadie ve la dirección de los demás etiquetados.
    const envios = usuarios
      .filter((u) => u.id_usuario !== id_usuario_origen && esEmailValido(u.email_persona))
      .map((u) => enviarEmail({ para: u.email_persona.trim(), ...email }));
    return (await Promise.all(envios)).filter(Boolean).length;
  } catch (error) {
    console.error(`No se pudieron enviar los emails de mención: ${error.message}`);
    return 0;
  }
};
