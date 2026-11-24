import { Router } from "express";
import { soloGestores } from "../middlewares/verifyRole.js";
import {
  actualizarProyecto,
  agregarIntegrante,
  archivarProyecto,
  crearProyecto,
  listarIntegrantes,
  listarProyectos,
  marcarResponsable,
  obtenerProyecto,
  quitarIntegrante,
} from "../controllers/proyectosControllers.js";
import { desvincularRepositorio, listarRepositorios, vincularRepositorio } from "../controllers/integracionesControllers.js";

const router = Router();

// soloGestores filtra por rol; que además sea integrante de ESE proyecto lo valida el service.
router.get("/", listarProyectos);
router.post("/", soloGestores, crearProyecto);
router.get("/:id_proyecto", obtenerProyecto);
router.put("/:id_proyecto", soloGestores, actualizarProyecto);
router.patch("/:id_proyecto/archivar", soloGestores, archivarProyecto);

router.get("/:id_proyecto/integrantes", listarIntegrantes);
router.post("/:id_proyecto/integrantes", soloGestores, agregarIntegrante);
router.patch("/:id_proyecto/integrantes/:id_usuario", soloGestores, marcarResponsable);
router.delete("/:id_proyecto/integrantes/:id_usuario", soloGestores, quitarIntegrante);

// Repositorios de git del proyecto: los commits de esos repos generan tareas acá.
router.get("/:id_proyecto/repositorios", listarRepositorios);
router.post("/:id_proyecto/repositorios", soloGestores, vincularRepositorio);
router.delete("/:id_proyecto/repositorios/:id_proyecto_repositorio", soloGestores, desvincularRepositorio);

export default router;
