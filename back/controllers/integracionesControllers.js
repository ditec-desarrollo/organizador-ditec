import * as integracionesService from "../services/integracionesService.js";
import { datosAlias, datosCommit, datosRepositorio, filtrosCommits } from "../validations/integracionesValidation.js";
import { idDeRuta } from "../utils/validador.js";
import { RESULTADOS_COMMIT } from "../utils/constantes.js";

// ───────────── Commits (los avisa el hook de Claude Code, con la clave de integración) ─────────────

export const recibirCommit = async (req, res) => {
  const respuesta = await integracionesService.recibirCommit(datosCommit(req.body));
  const creada = respuesta.resultado === RESULTADOS_COMMIT.TAREA_CREADA && !respuesta.repetido;
  res.status(creada ? 201 : 200).json(respuesta);
};

export const listarCommits = async (req, res) => {
  res.json(await integracionesService.listarCommits(filtrosCommits(req.query)));
};

export const reprocesarCommits = async (req, res) => {
  res.json(await integracionesService.reprocesarPendientes());
};

// ───────────── Repositorios de un proyecto ─────────────

const idProyecto = (req) => idDeRuta(req.params.id_proyecto, "id_proyecto");

export const listarRepositorios = async (req, res) => {
  res.json(await integracionesService.listarRepositorios(req.usuario, idProyecto(req)));
};

export const vincularRepositorio = async (req, res) => {
  const repositorios = await integracionesService.vincularRepositorio(req.usuario, idProyecto(req), datosRepositorio(req.body));
  res.status(201).json(repositorios);
};

export const desvincularRepositorio = async (req, res) => {
  const id_proyecto_repositorio = idDeRuta(req.params.id_proyecto_repositorio, "id_proyecto_repositorio");
  res.json(await integracionesService.desvincularRepositorio(req.usuario, idProyecto(req), id_proyecto_repositorio));
};

// ───────────── Identidades de git de un usuario ─────────────

const idUsuario = (req) => idDeRuta(req.params.id_usuario, "id_usuario");

export const listarAlias = async (req, res) => {
  res.json(await integracionesService.listarAlias(idUsuario(req)));
};

export const agregarAlias = async (req, res) => {
  const alias = await integracionesService.agregarAlias(req.usuario, idUsuario(req), datosAlias(req.body));
  res.status(201).json(alias);
};

export const quitarAlias = async (req, res) => {
  const id_usuario_alias_git = idDeRuta(req.params.id_usuario_alias_git, "id_usuario_alias_git");
  res.json(await integracionesService.quitarAlias(req.usuario, idUsuario(req), id_usuario_alias_git));
};
