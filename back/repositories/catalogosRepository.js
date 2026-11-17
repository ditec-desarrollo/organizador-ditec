import { consultar } from "../config/dbOrganizador.js";

export const tiposUsuario = () =>
  consultar("SELECT id_tusuario, nombre_tusuario FROM tipo_usuario WHERE habilita = 1 ORDER BY id_tusuario");

export const estadosProyecto = () =>
  consultar("SELECT id_eproyecto, nombre_eproyecto, orden FROM estado_proyecto WHERE habilita = 1 ORDER BY orden");

export const estadosTarea = (connection) =>
  consultar("SELECT id_etarea, nombre_etarea, orden, es_final FROM estado_tarea WHERE habilita = 1 ORDER BY orden", [], connection);

export const prioridades = () =>
  consultar("SELECT id_prioridad, nombre_prioridad, orden FROM prioridad WHERE habilita = 1 ORDER BY orden");

export const tiposActualizacion = () =>
  consultar("SELECT id_tactualizacion, nombre_tactualizacion FROM tipo_actualizacion WHERE habilita = 1 ORDER BY id_tactualizacion");
