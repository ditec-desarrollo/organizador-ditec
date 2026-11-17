import * as tareasService from "../services/tareasService.js";
import { datosArchivar } from "../validations/proyectosValidation.js";
import {
  datosActualizacion,
  datosComentario,
  datosMover,
  datosTarea,
  datosTareaNueva,
  filtrosTarea,
} from "../validations/tareasValidation.js";
import { idDeRuta } from "../utils/validador.js";

const idTarea = (req) => idDeRuta(req.params.id_tarea, "id_tarea");

export const listarTareas = async (req, res) => {
  res.json(await tareasService.listar(req.usuario, filtrosTarea(req.query)));
};

export const obtenerTarea = async (req, res) => {
  res.json(await tareasService.obtener(req.usuario, idTarea(req)));
};

export const crearTarea = async (req, res) => {
  const tarea = await tareasService.crear(req.usuario, datosTareaNueva(req.body));
  res.status(201).json(tarea);
};

export const actualizarTarea = async (req, res) => {
  res.json(await tareasService.actualizar(req.usuario, idTarea(req), datosTarea(req.body)));
};

export const archivarTarea = async (req, res) => {
  res.json(await tareasService.archivar(req.usuario, idTarea(req), datosArchivar(req.body, "archivada")));
};

export const moverTarea = async (req, res) => {
  res.json(await tareasService.mover(req.usuario, idTarea(req), datosMover(req.body)));
};

export const listarActualizaciones = async (req, res) => {
  res.json(await tareasService.listarActualizaciones(req.usuario, idTarea(req)));
};

export const registrarActualizacion = async (req, res) => {
  const tarea = await tareasService.registrarActualizacion(req.usuario, idTarea(req), datosActualizacion(req.body));
  res.status(201).json(tarea);
};

export const listarComentarios = async (req, res) => {
  res.json(await tareasService.listarComentarios(req.usuario, idTarea(req)));
};

export const agregarComentario = async (req, res) => {
  const comentarios = await tareasService.agregarComentario(req.usuario, idTarea(req), datosComentario(req.body));
  res.status(201).json(comentarios);
};

export const eliminarComentario = async (req, res) => {
  const id_tarea_comentario = idDeRuta(req.params.id_tarea_comentario, "id_tarea_comentario");
  res.json(await tareasService.eliminarComentario(req.usuario, idTarea(req), id_tarea_comentario));
};
