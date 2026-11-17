import { Router } from "express";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  resumenNotificaciones,
} from "../controllers/generalesControllers.js";

const router = Router();

router.get("/", listarNotificaciones);
router.get("/resumen", resumenNotificaciones);
router.patch("/leidas", marcarTodasLeidas);
router.patch("/:id_notificacion/leida", marcarNotificacionLeida);

export default router;
