import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import app from "./app.js";
import { env } from "./config/env.js";
import { cerrarPool } from "./config/dbOrganizador.js";
import { iniciarAvisosDeVencimiento } from "./jobs/avisosDeVencimiento.js";

// En producción el back sirve HTTPS directamente, como el resto de los backs de DITEC.
// En vez de comentar y descomentar código, se activa con HTTPS_KEY y HTTPS_CERT en el .env.
const conHttps = Boolean(env.https.key && env.https.cert);

const crearServidor = () =>
  conHttps
    ? https.createServer({ key: fs.readFileSync(env.https.key), cert: fs.readFileSync(env.https.cert) }, app)
    : http.createServer(app);

const servidor = crearServidor().listen(env.puerto, () => {
  console.log(`server listening on port ${env.puerto} (${conHttps ? "https" : "http"})`);
  iniciarAvisosDeVencimiento();
});

// Cierre ordenado: deja de aceptar pedidos y libera las conexiones a la base.
const apagar = () => {
  servidor.close(async () => {
    await cerrarPool();
    process.exit(0);
  });
};

process.on("SIGINT", apagar);
process.on("SIGTERM", apagar);
