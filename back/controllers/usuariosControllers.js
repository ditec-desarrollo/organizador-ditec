import * as usuariosService from "../services/usuariosService.js";
import { datosUsuario, datosUsuarioNuevo, documentoDePersona, filtrosUsuario, palabrasDeBusqueda } from "../validations/usuariosValidation.js";
import { idDeRuta } from "../utils/validador.js";
import CustomError from "../utils/customError.js";

// Mismo contrato que el resto de las apps de DITEC: { usuario }.
export const getAuthStatus = async (req, res) => {
  const usuario = await usuariosService.estadoDeSesion(req.id);
  if (!usuario) throw new CustomError("Autenticación fallida", 401);
  res.json({ usuario });
};

export const listarUsuarios = async (req, res) => {
  res.json(await usuariosService.listar(filtrosUsuario(req.query)));
};

export const listarEtiquetables = async (req, res) => {
  res.json(await usuariosService.listarEtiquetables());
};

export const buscarPersona = async (req, res) => {
  res.json(await usuariosService.buscarPersona(documentoDePersona(req.params)));
};

export const buscarPersonas = async (req, res) => {
  res.json(await usuariosService.buscarPersonas(palabrasDeBusqueda(req.query)));
};

export const crearUsuario =async (req, res) => {
  const usuario = await usuariosService.crear(req.usuario, datosUsuarioNuevo(req.body));
  res.status(201).json(usuario);
};

export const actualizarUsuario = async (req, res) => {
  const id_usuario = idDeRuta(req.params.id_usuario, "id_usuario");
  res.json(await usuariosService.actualizar(req.usuario, id_usuario, datosUsuario(req.body)));
};
