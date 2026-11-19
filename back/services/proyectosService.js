import { enTransaccion } from "../config/dbOrganizador.js";
import * as proyectosRepository from "../repositories/proyectosRepository.js";
import * as usuariosRepository from "../repositories/usuariosRepository.js";
import * as actividadRepository from "../repositories/actividadRepository.js";
import { accesoAProyecto, exigirGestionDeProyecto, exigirProyectoActivo } from "./permisosService.js";
import { conflicto, noEncontrado } from "../utils/customError.js";
import { ACCIONES } from "../utils/constantes.js";

export const listar = (usuario, filtros) => proyectosRepository.listar(usuario, filtros);

export const obtener = async (usuario, id_proyecto) => {
  const { proyecto, puedeGestionar } = await accesoAProyecto(usuario, id_proyecto);
  const integrantes = await proyectosRepository.listarIntegrantes(id_proyecto);
  return { ...proyecto, integrantes, puede_gestionar: puedeGestionar };
};

// Quien crea el proyecto queda como integrante (así un supervisor ya lo puede gestionar) y como responsable.
export const crear = async (usuario, datos) => {
  const id_proyecto = await enTransaccion(async (connection) => {
    const id = await proyectosRepository.crear({ ...datos, id_usuario_alta: usuario.id_usuario }, connection);
    await proyectosRepository.agregarIntegrante(id, usuario.id_usuario, usuario.id_usuario, connection);
    await proyectosRepository.marcarResponsable(id, usuario.id_usuario, 1, connection);
    await actividadRepository.registrar(
      { id_usuario: usuario.id_usuario, accion: ACCIONES.PROYECTO_CREADO, id_proyecto: id, descripcion: `creó el proyecto "${datos.nombre_proyecto}"` },
      connection,
    );
    return id;
  });
  return obtener(usuario, id_proyecto);
};

export const actualizar = async (usuario, id_proyecto, datos) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, id_proyecto);
  exigirProyectoActivo(proyecto);

  await enTransaccion(async (connection) => {
    await proyectosRepository.actualizar(id_proyecto, datos, connection);
    await actividadRepository.registrar(
      { id_usuario: usuario.id_usuario, accion: ACCIONES.PROYECTO_EDITADO, id_proyecto, descripcion: `editó el proyecto "${datos.nombre_proyecto}"` },
      connection,
    );
  });
  return obtener(usuario, id_proyecto);
};

export const archivar = async (usuario, id_proyecto, archivado) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, id_proyecto);
  if (proyecto.archivado === archivado) return obtener(usuario, id_proyecto);

  await enTransaccion(async (connection) => {
    await proyectosRepository.archivar(id_proyecto, archivado, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: archivado === 1 ? ACCIONES.PROYECTO_ARCHIVADO : ACCIONES.PROYECTO_DESARCHIVADO,
        id_proyecto,
        descripcion: `${archivado === 1 ? "archivó" : "desarchivó"} el proyecto "${proyecto.nombre_proyecto}"`,
      },
      connection,
    );
  });
  return obtener(usuario, id_proyecto);
};

// ───────────── Integrantes ─────────────

export const listarIntegrantes = async (usuario, id_proyecto) => {
  await accesoAProyecto(usuario, id_proyecto);
  return proyectosRepository.listarIntegrantes(id_proyecto);
};

export const agregarIntegrante = async (usuario, id_proyecto, id_usuario) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, id_proyecto);
  exigirProyectoActivo(proyecto);

  const nuevo = await usuariosRepository.obtener(id_usuario);
  if (!nuevo || nuevo.habilita !== 1) throw noEncontrado("El usuario no existe o está deshabilitado");
  if (await proyectosRepository.esIntegrante(id_proyecto, id_usuario)) throw conflicto("Ese usuario ya es integrante del proyecto");

  await enTransaccion(async (connection) => {
    await proyectosRepository.agregarIntegrante(id_proyecto, id_usuario, usuario.id_usuario, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: ACCIONES.INTEGRANTE_AGREGADO,
        id_proyecto,
        descripcion: `sumó a ${nuevo.nombre_persona} ${nuevo.apellido_persona} al proyecto "${proyecto.nombre_proyecto}"`,
      },
      connection,
    );
  });
  return proyectosRepository.listarIntegrantes(id_proyecto);
};

// Marca o desmarca a un integrante como responsable del proyecto. Puede haber varios.
// Es un dato informativo: los permisos siguen dependiendo del rol.
export const marcarResponsable = async (usuario, id_proyecto, id_usuario, es_responsable) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, id_proyecto);
  exigirProyectoActivo(proyecto);
  if (!(await proyectosRepository.esIntegrante(id_proyecto, id_usuario))) throw noEncontrado("Ese usuario no es integrante del proyecto");

  const integrante = await usuariosRepository.obtener(id_usuario);
  const nombre = `${integrante.nombre_persona} ${integrante.apellido_persona}`;
  await enTransaccion(async (connection) => {
    await proyectosRepository.marcarResponsable(id_proyecto, id_usuario, es_responsable, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: ACCIONES.PROYECTO_EDITADO,
        id_proyecto,
        descripcion:
          es_responsable === 1
            ? `marcó a ${nombre} como responsable del proyecto "${proyecto.nombre_proyecto}"`
            : `quitó a ${nombre} como responsable del proyecto "${proyecto.nombre_proyecto}"`,
      },
      connection,
    );
  });
  return proyectosRepository.listarIntegrantes(id_proyecto);
};

export const quitarIntegrante = async (usuario, id_proyecto, id_usuario) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, id_proyecto);
  exigirProyectoActivo(proyecto);

  if (!(await proyectosRepository.esIntegrante(id_proyecto, id_usuario))) throw noEncontrado("Ese usuario no es integrante del proyecto");

  // No se deja una tarea abierta a nombre de alguien que ya no está en el proyecto.
  const abiertas = await proyectosRepository.contarTareasAbiertasDe(id_proyecto, id_usuario);
  if (abiertas > 0) {
    throw conflicto(`Tiene ${abiertas} tarea(s) sin finalizar en este proyecto: reasignalas antes de quitarlo`);
  }

  const quitado = await usuariosRepository.obtener(id_usuario);
  await enTransaccion(async (connection) => {
    await proyectosRepository.quitarIntegrante(id_proyecto, id_usuario, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: ACCIONES.INTEGRANTE_QUITADO,
        id_proyecto,
        descripcion: `quitó a ${quitado.nombre_persona} ${quitado.apellido_persona} del proyecto "${proyecto.nombre_proyecto}"`,
      },
      connection,
    );
  });
  return proyectosRepository.listarIntegrantes(id_proyecto);
};
