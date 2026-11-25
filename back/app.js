import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import auth from "./middlewares/auth.js";
import { usuarioHabilitado } from "./middlewares/verifyRole.js";
import { manejoErrores, rutaNoEncontrada } from "./middlewares/manejoErrores.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import proyectosRoutes from "./routes/proyectosRoutes.js";
import tareasRoutes from "./routes/tareasRoutes.js";
import notificacionesRoutes from "./routes/notificacionesRoutes.js";
import integracionesRoutes from "./routes/integracionesRoutes.js";
import claveDeIntegracion from "./middlewares/claveDeIntegracion.js";
import { listarActividad, obtenerCatalogos, obtenerDashboard } from "./controllers/generalesControllers.js";
import { recibirCommit } from "./controllers/integracionesControllers.js";

const app = express();

// CORS: solo los orígenes de CORS_ORIGENES. Si no se configuró ninguno (desarrollo), solo localhost.
const ES_LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const origenPermitido = (origen) =>
  env.corsOrigenes.length > 0 ? env.corsOrigenes.includes(origen) : ES_LOCALHOST.test(origen);

app.use(helmet());
app.use(
  cors({
    // Sin cabecera Origin (curl, health checks, server a server) no aplica CORS.
    origin: (origen, callback) => callback(null, !origen || origenPermitido(origen)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "200kb" }));

// Rutas sin token de Ciudad Digital. Todo lo que no esté acá lo exige.
// La de commits no es abierta: la llama el hook de Claude Code y se protege con la clave de integración.
const RUTAS_PUBLICAS = [
  ["GET", /^\/salud\/?$/],
  ["POST", /^\/integraciones\/commits\/?$/],
];

const esRutaPublica = (req) => RUTAS_PUBLICAS.some(([metodo, ruta]) => req.method === metodo && ruta.test(req.path));

app.get("/salud", (req, res) => res.json({ ok: true }));
app.post("/integraciones/commits", claveDeIntegracion, recibirCommit);

app.use((req, res, next) => (esRutaPublica(req) ? next() : auth(req, res, next)));

// /usuarios/authStatus responde con el token solo; el resto exige ser usuario habilitado del Organizador.
app.use("/usuarios", usuariosRoutes);
app.get("/catalogos", usuarioHabilitado, obtenerCatalogos);
app.get("/dashboard", usuarioHabilitado, obtenerDashboard);
app.get("/actividad", usuarioHabilitado, listarActividad);
app.use("/proyectos", usuarioHabilitado, proyectosRoutes);
app.use("/tareas", usuarioHabilitado, tareasRoutes);
app.use("/notificaciones", usuarioHabilitado, notificacionesRoutes);
app.use("/integraciones", usuarioHabilitado, integracionesRoutes);

app.use(rutaNoEncontrada);
app.use(manejoErrores);

export default app;
