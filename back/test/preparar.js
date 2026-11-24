// Variables de entorno para las pruebas que no tocan la base.
// Se importa antes que cualquier módulo del back (config/env.js las lee al cargarse).
process.env.JWT_SECRET_KEY = "clave-solo-para-pruebas";
process.env.HOST_ORGANIZADOR = "127.0.0.1";
process.env.PORT_ORGANIZADOR = "1"; // puerto cerrado: si una prueba llega a la base, falla en vez de escribir
process.env.USER_ORGANIZADOR = "pruebas";
process.env.PASSWORD_ORGANIZADOR = "";
process.env.DB_ORGANIZADOR = "organizador_pruebas";
process.env.DB_CIU_DIGITAL = "ciudadano_digital";
process.env.CORS_ORIGENES = "http://localhost:5173";
process.env.EMAIL_ACTIVO = "false"; // las pruebas nunca mandan mails, aunque el .env local lo tenga activo
process.env.INTEGRACION_API_KEY = "clave-de-integracion-solo-para-pruebas";
