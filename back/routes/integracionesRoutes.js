import { Router } from "express";
import { soloAdmin } from "../middlewares/verifyRole.js";
import { listarCommits, reprocesarCommits } from "../controllers/integracionesControllers.js";

// Consulta y reproceso de los commits recibidos, para el administrador (con token de Ciudad Digital).
// La entrada de commits (POST /integraciones/commits) no está acá: va con clave de integración
// y se monta en app.js antes de la autenticación.
const router = Router();

router.get("/commits", soloAdmin, listarCommits);
router.post("/commits/reprocesar", soloAdmin, reprocesarCommits);

export default router;
