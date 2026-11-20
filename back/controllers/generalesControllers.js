import * as catalogosRepository from "../repositories/catalogosRepository.js";
import * as actividadRepository from "../repositories/actividadRepository.js";
import * as dashboardService from "../services/dashboardService.js";
import * as notificacionesService from "../services/notificacionesService.js";
import { filtrosActividad, filtrosNotificacion } from "../validations/tareasValidation.js";
import { idDeRuta } from "../utils/validador.js";
import { env } from "../config/env.js";

// Catálogos que usa el front para armar selects, columnas del tablero y chips.
export const obtenerCatalogos = async (req, res) => {
  const [tiposUsuario, estadosProyecto, estadosTarea, prioridades, tiposActualizacion] = await Promise.all([
    catalogosRepository.tiposUsuario(),
    catalogosRepository.estadosProyecto(),
    catalogosRepository.estadosTarea(),
    catalogosRepository.prioridades(),
    catalogosRepository.tiposActualizacion(),
  ]);
  // `configuracion`: valores del .env que el front necesita para explicar lo que muestra.
  const configuracion = {
    dias_aviso_vencimiento: env.diasAvisoVencimiento,
    dias_finalizadas_en_tablero: env.diasFinalizadasEnTablero,
  };
  res.json({ tiposUsuario, estadosProyecto, estadosTarea, prioridades, tiposActualizacion, configuracion });
};

export const obtenerDashboard = async (req, res) => {
  // ?amplio=1 lo pide la vista para televisión.
  res.json(await dashboardService.obtener(req.usuario, { amplio: req.query.amplio === "1" }));
};

export const listarActividad = async (req, res) => {
  res.json(await actividadRepository.listar(req.usuario, filtrosActividad(req.query)));
};

// ───────────── Notificaciones (siempre las del usuario de la sesión) ─────────────

export const listarNotificaciones = async (req, res) => {
  res.json(await notificacionesService.listar(req.usuario, filtrosNotificacion(req.query)));
};

export const resumenNotificaciones = async (req, res) => {
  res.json(await notificacionesService.resumen(req.usuario));
};

export const marcarNotificacionLeida = async (req, res) => {
  await notificacionesService.marcarLeida(req.usuario, idDeRuta(req.params.id_notificacion, "id_notificacion"));
  res.json(await notificacionesService.resumen(req.usuario));
};

export const marcarTodasLeidas = async (req, res) => {
  await notificacionesService.marcarTodasLeidas(req.usuario);
  res.json(await notificacionesService.resumen(req.usuario));
};
