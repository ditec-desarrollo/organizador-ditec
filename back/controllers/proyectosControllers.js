import * as proyectosService from "../services/proyectosService.js";
import { datosArchivar, datosIntegrante, datosProyecto, filtrosProyecto } from "../validations/proyectosValidation.js";
import { idDeRuta } from "../utils/validador.js";

const idProyecto = (req) => idDeRuta(req.params.id_proyecto, "id_proyecto");

export const listarProyectos = async (req, res) => {
  res.json(await proyectosService.listar(req.usuario, filtrosProyecto(req.query)));
};

export const obtenerProyecto = async (req, res) => {
  res.json(await proyectosService.obtener(req.usuario, idProyecto(req)));
};

export const crearProyecto = async (req, res) => {
  const proyecto = await proyectosService.crear(req.usuario, datosProyecto(req.body));
  res.status(201).json(proyecto);
};

export const actualizarProyecto = async (req, res) => {
  res.json(await proyectosService.actualizar(req.usuario, idProyecto(req), datosProyecto(req.body)));
};

export const archivarProyecto = async (req, res) => {
  res.json(await proyectosService.archivar(req.usuario, idProyecto(req), datosArchivar(req.body, "archivado")));
};

export const listarIntegrantes = async (req, res) => {
  res.json(await proyectosService.listarIntegrantes(req.usuario, idProyecto(req)));
};

export const agregarIntegrante = async (req, res) => {
  const integrantes = await proyectosService.agregarIntegrante(req.usuario, idProyecto(req), datosIntegrante(req.body));
  res.status(201).json(integrantes);
};

export const marcarResponsable = async (req, res) => {
  const id_usuario = idDeRuta(req.params.id_usuario, "id_usuario");
  const es_responsable = datosArchivar(req.body, "es_responsable");
  res.json(await proyectosService.marcarResponsable(req.usuario, idProyecto(req), id_usuario, es_responsable));
};

export const quitarIntegrante = async (req, res) => {
  const id_usuario = idDeRuta(req.params.id_usuario, "id_usuario");
  res.json(await proyectosService.quitarIntegrante(req.usuario, idProyecto(req), id_usuario));
};
