import { Router } from "express";
import { soloGestores } from "../middlewares/verifyRole.js";
import {
  actualizarTarea,
  agregarComentario,
  archivarTarea,
  crearTarea,
  eliminarComentario,
  listarActualizaciones,
  listarComentarios,
  listarTareas,
  moverTarea,
  obtenerTarea,
  registrarActualizacion,
} from "../controllers/tareasControllers.js";

const router = Router();

router.get("/", listarTareas);
router.post("/", soloGestores, crearTarea);
router.get("/:id_tarea", obtenerTarea);
router.put("/:id_tarea", soloGestores, actualizarTarea);
router.patch("/:id_tarea/archivar", soloGestores, archivarTarea);

// Seguimiento: el responsable de la tarea o quien gestiona el proyecto (lo valida el service).
router.patch("/:id_tarea/mover", moverTarea);
router.get("/:id_tarea/actualizaciones", listarActualizaciones);
router.post("/:id_tarea/actualizaciones", registrarActualizacion);

router.get("/:id_tarea/comentarios", listarComentarios);
router.post("/:id_tarea/comentarios", agregarComentario);
router.delete("/:id_tarea/comentarios/:id_tarea_comentario", eliminarComentario);

export default router;
