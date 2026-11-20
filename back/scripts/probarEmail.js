// Manda un mail de prueba con la configuración del .env y muestra por qué falla, si falla.
//
//   npm run email:probar -- destino@ejemplo.com
import { env } from "../config/env.js";
import { enviarEmail } from "../services/emailService.js";

const destino = process.argv[2];
if (!destino) {
  console.error("Falta el destinatario:  npm run email:probar -- destino@ejemplo.com");
  process.exit(1);
}

console.log(`EMAIL_ACTIVO:  ${env.email.activo}`);
console.log(`EMAIL_USUARIO: ${env.email.usuario}`);
console.log(`PASSWORD_MAIL: ${env.email.password ? "cargada" : "VACÍA"}`);
console.log(`URL_FRONT:     ${env.urlFront || "(vacía: el mail sale sin botón)"}`);

if (!env.email.activo) {
  console.error("\nEMAIL_ACTIVO no está en true: el back no manda ningún mail.");
  process.exit(1);
}

// Si falla, enviarEmail deja el motivo en la consola ("No se pudo enviar el email …").
const enviado = await enviarEmail({
  para: destino,
  asunto: "Prueba de email del Organizador",
  texto: "Si te llegó este mensaje, el envío de emails del Organizador funciona.",
  html: "<p>Si te llegó este mensaje, el envío de emails del Organizador funciona.</p>",
});

console.log(enviado ? `\nEnviado a ${destino}. Si no aparece, revisá la carpeta de spam.` : "\nNo se envió: el motivo está en la línea de arriba.");
process.exit(enviado ? 0 : 1);
