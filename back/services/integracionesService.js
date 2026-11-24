import { enTransaccion } from "../config/dbOrganizador.js";
import * as integracionesRepository from "../repositories/integracionesRepository.js";
import * as proyectosRepository from "../repositories/proyectosRepository.js";
import * as usuariosRepository from "../repositories/usuariosRepository.js";
import * as actividadRepository from "../repositories/actividadRepository.js";
import { aplicarSeguimiento, insertarTarea } from "./tareasService.js";
import { accesoAProyecto, accesoATarea, exigirGestionDeProyecto, exigirProyectoActivo } from "./permisosService.js";
import CustomError, { conflicto, noEncontrado } from "../utils/customError.js";
import {
  ACCIONES,
  ESTADOS_TAREA,
  PRIORIDADES,
  RESULTADOS_COMMIT,
  RESULTADOS_COMMIT_PENDIENTES,
  TIPOS_ACTUALIZACION,
} from "../utils/constantes.js";
import { descripcionDeCommit, esMerge, novedadDeCommit, shaCorto, tareaReferida, tituloDeCommit } from "../utils/commits.js";
import { normalizarAlias } from "../utils/repositorio.js";

// Integración con git: el hook de Claude Code avisa cada commit a POST /integraciones/commits
// y acá se decide qué hacer con él:
//
//   merge                                  -> se ignora
//   repositorio sin vincular a un proyecto -> queda pendiente (SIN_PROYECTO)
//   autor que no es usuario del Organizador-> queda pendiente (SIN_USUARIO)
//   el mensaje dice "tarea #12"            -> novedad en la tarea 12 (si es de ese proyecto y el autor la puede actualizar)
//   cualquier otro                         -> tarea nueva, ya finalizada, a nombre del autor
//
// Los pendientes no se pierden: se vuelven a procesar solos cuando se vincula un repositorio o se
// carga un alias de git, y también a mano (POST /integraciones/commits/reprocesar).

// ───────────── A quién y a dónde va un commit ─────────────

// Quién hizo el commit: primero la identidad fija de la máquina (si el hook la manda), después el email
// y el nombre con los que firma git, contra los alias cargados. Si ninguno está cargado, vale el email
// de Ciudad Digital.
const usuarioDeCommit = async (connection, commit) => {
  const candidatos = [...new Set([commit.autor_alias, commit.autor_email, commit.autor_nombre].map(normalizarAlias).filter(Boolean))];
  const porAlias = await integracionesRepository.usuarioDeAlias(candidatos, connection);
  if (porAlias) return porAlias;
  const email = normalizarAlias(commit.autor_email);
  return email ? integracionesRepository.usuarioDeEmail(email, connection) : null;
};

// El commit nombra una tarea: se registra como novedad de esa tarea en vez de crear otra.
// Devuelve false (y entonces se crea una tarea nueva) si la tarea no existe, es de otro proyecto,
// está archivada o el autor no la podría actualizar desde la pantalla.
const avanzarTarea = async (connection, usuario, proyecto, id_tarea, commit) => {
  let acceso;
  try {
    acceso = await accesoATarea(usuario, id_tarea, connection);
  } catch (error) {
    if (error instanceof CustomError) return false;
    throw error;
  }
  const { tarea, puedeActualizar } = acceso;
  if (!puedeActualizar || tarea.id_proyecto !== proyecto.id_proyecto || tarea.archivada === 1) return false;

  await aplicarSeguimiento(connection, usuario, tarea, {
    id_tactualizacion: TIPOS_ACTUALIZACION.NOVEDAD,
    // Si todavía estaba pendiente, un commit quiere decir que se empezó a trabajar en ella.
    id_etarea: tarea.id_etarea === ESTADOS_TAREA.PENDIENTE ? ESTADOS_TAREA.EN_PROGRESO : undefined,
    comentario: novedadDeCommit(commit),
  });
  return true;
};

// Tarea nueva a nombre del autor, ya finalizada: el trabajo que describe el commit está hecho.
// Así aparece unos días en la columna Finalizada del tablero y después queda en el Historial.
const crearTareaDeCommit = async (connection, usuario, proyecto, commit) => {
  // Para ser responsable de una tarea hay que ser integrante del proyecto (igual que al etiquetar con @).
  if (!(await proyectosRepository.esIntegrante(proyecto.id_proyecto, usuario.id_usuario, connection))) {
    await proyectosRepository.agregarIntegrante(proyecto.id_proyecto, usuario.id_usuario, usuario.id_usuario, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: ACCIONES.INTEGRANTE_AGREGADO,
        id_proyecto: proyecto.id_proyecto,
        descripcion: `se sumó al proyecto "${proyecto.nombre_proyecto}" al registrar un commit`,
      },
      connection,
    );
  }

  return insertarTarea(
    connection,
    usuario,
    proyecto,
    {
      id_proyecto: proyecto.id_proyecto,
      titulo: tituloDeCommit(commit.mensaje, commit.commit_sha),
      descripcion: descripcionDeCommit(commit),
      ids_responsables: [usuario.id_usuario],
      id_prioridad: PRIORIDADES.MEDIA,
      id_etarea: ESTADOS_TAREA.FINALIZADA,
      fecha_inicio: commit.fecha_commit ? commit.fecha_commit.slice(0, 10) : null,
      fecha_vencimiento: null,
    },
    { origen: `a partir del commit ${shaCorto(commit.commit_sha)}` },
  );
};

// Decide qué hacer con un commit y lo hace. Devuelve lo que se anota en commit_recibido.
const resolver = async (connection, commit) => {
  const sin = { id_proyecto: null, id_usuario: null, id_tarea: null };
  if (commit.es_merge || esMerge(commit.mensaje)) return { ...sin, resultado: RESULTADOS_COMMIT.IGNORADO_MERGE };

  const id_proyecto = await integracionesRepository.proyectoDeRepositorio([commit.repositorio, commit.carpeta], connection);
  const proyecto = id_proyecto ? await proyectosRepository.obtener(id_proyecto, connection) : null;
  if (!proyecto) return { ...sin, resultado: RESULTADOS_COMMIT.SIN_PROYECTO };
  if (proyecto.archivado === 1) return { ...sin, id_proyecto, resultado: RESULTADOS_COMMIT.PROYECTO_ARCHIVADO };

  const id_usuario = await usuarioDeCommit(connection, commit);
  if (!id_usuario) return { ...sin, id_proyecto, resultado: RESULTADOS_COMMIT.SIN_USUARIO };
  const usuario = await usuariosRepository.obtener(id_usuario, connection);

  const id_referida = tareaReferida(commit.mensaje);
  if (id_referida && (await avanzarTarea(connection, usuario, proyecto, id_referida, commit))) {
    return { id_proyecto, id_usuario, id_tarea: id_referida, resultado: RESULTADOS_COMMIT.TAREA_ACTUALIZADA };
  }

  const id_tarea = await crearTareaDeCommit(connection, usuario, proyecto, commit);
  return { id_proyecto, id_usuario, id_tarea, resultado: RESULTADOS_COMMIT.TAREA_CREADA };
};

// Explicación para el log del hook: qué se hizo o qué falta configurar.
const detalleDe = (commit) => {
  const autor = [commit.autor_nombre, commit.autor_email && `<${commit.autor_email}>`].filter(Boolean).join(" ") || "sin datos";
  return {
    [RESULTADOS_COMMIT.TAREA_CREADA]: `Se creó la tarea #${commit.id_tarea}`,
    [RESULTADOS_COMMIT.TAREA_ACTUALIZADA]: `Se registró una novedad en la tarea #${commit.id_tarea}`,
    [RESULTADOS_COMMIT.IGNORADO_MERGE]: "Es un merge: no genera tarea",
    [RESULTADOS_COMMIT.SIN_PROYECTO]: `El repositorio "${commit.repositorio}" no está vinculado a ningún proyecto del Organizador`,
    [RESULTADOS_COMMIT.SIN_USUARIO]: `El autor ${autor} no corresponde a ningún usuario habilitado del Organizador`,
    [RESULTADOS_COMMIT.PROYECTO_ARCHIVADO]: "El proyecto está archivado",
  }[commit.resultado];
};

const esPendiente = (resultado) => RESULTADOS_COMMIT_PENDIENTES.includes(resultado);

// Procesa un commit ya anotado. Si ya estaba resuelto no hace nada (`repetido`): reenviarlo no duplica la tarea.
const procesar = async (connection, commit_sha, { es_merge = false } = {}) => {
  const commit = await integracionesRepository.obtenerCommitParaProcesar(commit_sha, connection);
  const repetido = !esPendiente(commit.resultado);
  let final = commit;
  if (!repetido) {
    const resuelto = await resolver(connection, { ...commit, es_merge });
    await integracionesRepository.guardarResultado(commit.id_commit_recibido, resuelto, connection);
    final = { ...commit, ...resuelto };
  }
  return {
    commit_sha,
    resultado: final.resultado,
    pendiente: esPendiente(final.resultado),
    repetido,
    id_proyecto: final.id_proyecto,
    id_tarea: final.id_tarea,
    detalle: detalleDe(final),
  };
};

// ───────────── Entrada de commits ─────────────

// Un commit nuevo entra como pendiente y se procesa en la misma transacción: o queda todo (el commit
// anotado, la tarea, su bitácora) o no queda nada y el hook lo reintenta.
export const recibirCommit = (datos) =>
  enTransaccion(async (connection) => {
    await integracionesRepository.registrarCommit({ ...datos, resultado: RESULTADOS_COMMIT.SIN_PROYECTO }, connection);
    return procesar(connection, datos.commit_sha, { es_merge: datos.es_merge === 1 });
  });

// Vuelve a intentar con los que quedaron pendientes. Cada uno en su transacción: si uno falla, los demás siguen.
export const reprocesarPendientes = async () => {
  const pendientes = await integracionesRepository.shasPendientes();
  const conteo = { revisados: pendientes.length, tareas_creadas: 0, tareas_actualizadas: 0, siguen_pendientes: 0, con_error: 0 };

  for (const commit_sha of pendientes) {
    try {
      const { resultado, pendiente } = await enTransaccion((connection) => procesar(connection, commit_sha));
      if (resultado === RESULTADOS_COMMIT.TAREA_CREADA) conteo.tareas_creadas += 1;
      else if (resultado === RESULTADOS_COMMIT.TAREA_ACTUALIZADA) conteo.tareas_actualizadas += 1;
      else if (pendiente) conteo.siguen_pendientes += 1;
    } catch (error) {
      conteo.con_error += 1;
      console.error(`ERROR al reprocesar el commit ${shaCorto(commit_sha)}:`, error);
    }
  }
  return conteo;
};

// Después de vincular un repositorio o cargar un alias: lo que esperaba por eso se resuelve solo.
// Si falla no se deshace el cambio de configuración: los commits siguen pendientes y se reintenta después.
const reprocesarSinInterrumpir = async () => {
  try {
    await reprocesarPendientes();
  } catch (error) {
    console.error("ERROR al reprocesar los commits pendientes:", error);
  }
};

export const listarCommits = (filtros) => integracionesRepository.listarCommits(filtros);

// ───────────── Repositorios de un proyecto (quien gestiona el proyecto) ─────────────

export const listarRepositorios = async (usuario, id_proyecto) => {
  await accesoAProyecto(usuario, id_proyecto);
  return integracionesRepository.listarRepositorios(id_proyecto);
};

export const vincularRepositorio = async (usuario, id_proyecto, repositorio) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, id_proyecto);
  exigirProyectoActivo(proyecto);

  const existente = await integracionesRepository.buscarRepositorio(repositorio);
  if (existente?.habilita === 1) {
    throw conflicto(
      existente.id_proyecto === id_proyecto
        ? "Ese repositorio ya está vinculado a este proyecto"
        : `Ese repositorio ya está vinculado al proyecto "${existente.nombre_proyecto}"`,
    );
  }

  await enTransaccion(async (connection) => {
    await integracionesRepository.vincularRepositorio(id_proyecto, repositorio, usuario.id_usuario, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: ACCIONES.PROYECTO_EDITADO,
        id_proyecto,
        descripcion: `vinculó el repositorio ${repositorio} al proyecto "${proyecto.nombre_proyecto}"`,
      },
      connection,
    );
  });
  await reprocesarSinInterrumpir();
  return integracionesRepository.listarRepositorios(id_proyecto);
};

export const desvincularRepositorio = async (usuario, id_proyecto, id_proyecto_repositorio) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, id_proyecto);
  exigirProyectoActivo(proyecto);

  const vinculo = await integracionesRepository.obtenerRepositorio(id_proyecto, id_proyecto_repositorio);
  if (!vinculo) throw noEncontrado("Ese repositorio no está vinculado a este proyecto");

  await enTransaccion(async (connection) => {
    await integracionesRepository.desvincularRepositorio(id_proyecto_repositorio, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: ACCIONES.PROYECTO_EDITADO,
        id_proyecto,
        descripcion: `desvinculó el repositorio ${vinculo.repositorio} del proyecto "${proyecto.nombre_proyecto}"`,
      },
      connection,
    );
  });
  return integracionesRepository.listarRepositorios(id_proyecto);
};

// ───────────── Identidades de git de un usuario (solo administradores) ─────────────

const exigirUsuario = async (id_usuario) => {
  const usuario = await usuariosRepository.obtener(id_usuario);
  if (!usuario) throw noEncontrado("El usuario no existe");
  return usuario;
};

export const listarAlias = async (id_usuario) => {
  await exigirUsuario(id_usuario);
  return integracionesRepository.listarAlias(id_usuario);
};

export const agregarAlias = async (actor, id_usuario, alias) => {
  const usuario = await exigirUsuario(id_usuario);

  const existente = await integracionesRepository.buscarAlias(alias);
  if (existente?.habilita === 1) {
    throw conflicto(
      existente.id_usuario === id_usuario ? "Ese alias ya está cargado para este usuario" : `Ese alias ya es de ${existente.nombre_usuario}`,
    );
  }

  await integracionesRepository.guardarAlias(id_usuario, alias, actor.id_usuario);
  await actividadRepository.registrar({
    id_usuario: actor.id_usuario,
    accion: ACCIONES.USUARIO_EDITADO,
    descripcion: `cargó el alias de git "${alias}" para ${usuario.nombre_persona ?? ""} ${usuario.apellido_persona ?? ""}`.trim(),
  });
  await reprocesarSinInterrumpir();
  return integracionesRepository.listarAlias(id_usuario);
};

export const quitarAlias = async (actor, id_usuario, id_usuario_alias_git) => {
  const usuario = await exigirUsuario(id_usuario);
  const alias = await integracionesRepository.obtenerAlias(id_usuario, id_usuario_alias_git);
  if (!alias) throw noEncontrado("Ese alias no está cargado para este usuario");

  await integracionesRepository.quitarAlias(id_usuario_alias_git);
  await actividadRepository.registrar({
    id_usuario: actor.id_usuario,
    accion: ACCIONES.USUARIO_EDITADO,
    descripcion: `quitó el alias de git "${alias.alias}" de ${usuario.nombre_persona ?? ""} ${usuario.apellido_persona ?? ""}`.trim(),
  });
  return integracionesRepository.listarAlias(id_usuario);
};
