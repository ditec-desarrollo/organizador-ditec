import { Router } from "express";
import { soloAdmin, soloGestores, usuarioHabilitado } from "../middlewares/verifyRole.js";
import {
  actualizarUsuario,
  buscarPersona,
  buscarPersonas,
  crearUsuario,
  getAuthStatus,
  listarEtiquetables,
  listarUsuarios,
} from "../controllers/usuariosControllers.js";

const router = Router();

// Solo exige el token de Ciudad Digital: responde aunque la persona todavía no sea usuaria del Organizador.
router.get("/authStatus", getAuthStatus);

// Administradores y supervisores necesitan la lista para sumar integrantes y asignar tareas.
router.get("/", soloGestores, listarUsuarios);
// Lista mínima (id y nombre) para etiquetar con @ en los comentarios: la puede pedir cualquier usuario.
router.get("/etiquetables", usuarioHabilitado, listarEtiquetables);
router.get("/persona/:documento", soloAdmin, buscarPersona);
// Para el alta: personas de Ciudad Digital por N° de afiliado, nombre, apellido, CUIL o email (?buscar=).
router.get("/personas", soloAdmin, buscarPersonas);
router.post("/", soloAdmin, crearUsuario);
router.put("/:id_usuario", soloAdmin, actualizarUsuario);

export default router;
