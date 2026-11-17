import { Router } from "express";
import { soloAdmin, soloGestores } from "../middlewares/verifyRole.js";
import { actualizarUsuario, buscarPersona, crearUsuario, getAuthStatus, listarUsuarios } from "../controllers/usuariosControllers.js";

const router = Router();

// Solo exige el token de Ciudad Digital: responde aunque la persona todavía no sea usuaria del Organizador.
router.get("/authStatus", getAuthStatus);

// Administradores y supervisores necesitan la lista para sumar integrantes y asignar tareas.
router.get("/", soloGestores, listarUsuarios);
router.get("/persona/:documento", soloAdmin, buscarPersona);
router.post("/", soloAdmin, crearUsuario);
router.put("/:id_usuario", soloAdmin, actualizarUsuario);

export default router;
