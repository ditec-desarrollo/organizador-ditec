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
import { listarActividad, obtenerCatalogos, obtenerDashboard } from "./controllers/generalesControllers.js";

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

// Rutas públicas (sin token). Todo lo que no esté acá exige token de Ciudad Digital.
const RUTAS_PUBLICAS = [["GET", /^\/salud\/?$/]];

const esRutaPublica = (req) => RUTAS_PUBLICAS.some(([metodo, ruta]) => req.method === metodo && ruta.test(req.path));

app.get("/salud", (req, res) => res.json({ ok: true }));

app.use((req, res, next) => (esRutaPublica(req) ? next() : auth(req, res, next)));

// /usuarios/authStatus responde con el token solo; el resto exige ser usuario habilitado del Organizador.
app.use("/usuarios", usuariosRoutes);
app.get("/catalogos", usuarioHabilitado, obtenerCatalogos);
app.get("/dashboard", usuarioHabilitado, obtenerDashboard);
app.get("/actividad", usuarioHabilitado, listarActividad);
app.use("/proyectos", usuarioHabilitado, proyectosRoutes);
app.use("/tareas", usuarioHabilitado, tareasRoutes);
app.use("/notificaciones", usuarioHabilitado, notificacionesRoutes);

app.use(rutaNoEncontrada);
app.use(manejoErrores);

export default app;
