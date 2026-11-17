import app from "./app.js";
import { env } from "./config/env.js";
import { cerrarPool } from "./config/dbOrganizador.js";
import { iniciarAvisosDeVencimiento } from "./jobs/avisosDeVencimiento.js";

const servidor = app.listen(env.puerto, () => {
  console.log(`server listening on port ${env.puerto}`);
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
