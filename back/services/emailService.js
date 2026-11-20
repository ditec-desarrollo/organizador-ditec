import { lookup } from "node:dns/promises";
import nodemailer from "nodemailer";
import * as usuariosRepository from "../repositories/usuariosRepository.js";
import { armarEmailDeMencion, esEmailValido } from "../utils/emailMencion.js";
import { env } from "../config/env.js";

// Misma cuenta que el back de Ciudad Digital (Gmail).
const SMTP_HOST = "smtp.gmail.com";

// La dirección de Gmail se resuelve acá, con el resolver del sistema operativo (el mismo que usan
// curl o ping), y a nodemailer se le pasa la IP. Nodemailer consulta el DNS por su cuenta, sin pasar
// por el sistema, y en el servidor de producción esa consulta no recibe respuesta
// ("DNS lookup for smtp.gmail.com timed out"). `servername` mantiene la validación del certificado.
const crearTransporte = async () => {
  const { address } = await lookup(SMTP_HOST, { family: 4 });
  return nodemailer.createTransport({
    host: address,
    port: 465,
    secure: true,
    tls: { servername: SMTP_HOST },
    auth: { user: env.email.usuario, pass: env.email.password },
    // Si el servidor no llega a Gmail, que falle rápido y con un error claro en vez de quedar esperando minutos.
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
};

// Nunca lanza: un mail que no sale no tiene que romper lo que el usuario estaba haciendo.
export const enviarEmail = async ({ para, asunto, texto, html }) => {
  if (!env.email.activo) return false;
  try {
    const transporte = await crearTransporte();
    await transporte.sendMail({
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
