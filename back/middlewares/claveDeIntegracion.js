import crypto from "node:crypto";
import { env } from "../config/env.js";

const huella = (texto) => crypto.createHash("sha256").update(String(texto)).digest();

// Protege las rutas que llama otro sistema (el hook de Claude Code), que no tiene un token de
// Ciudad Digital: manda la clave del .env (INTEGRACION_API_KEY) en la cabecera X-Api-Key.
// Se comparan las huellas en tiempo constante para que la respuesta no revele cuánto coincidió.
export const claveDeIntegracion = (req, res, next) => {
  if (!env.integracionApiKey) {
    return res.status(503).json({ message: "La integración no está configurada en este servidor" });
  }
  const recibida = req.header("X-Api-Key") || "";
  if (!crypto.timingSafeEqual(huella(recibida), huella(env.integracionApiKey))) {
    return res.status(401).json({ message: "Clave de integración inválida" });
  }
  next();
};

export default claveDeIntegracion;
