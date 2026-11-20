import { enTransaccion } from "../config/dbOrganizador.js";
import * as tareasRepository from "../repositories/tareasRepository.js";
import * as proyectosRepository from "../repositories/proyectosRepository.js";
import * as usuariosRepository from "../repositories/usuariosRepository.js";
import * as catalogosRepository from "../repositories/catalogosRepository.js";
import * as actividadRepository from "../repositories/actividadRepository.js";
import { notificar } from "./notificacionesService.js";
import { enviarEmailsDeMencion } from "./emailService.js";
import { accesoATarea, exigirGestionDeProyecto, exigirProyectoActivo, exigirTareaActiva } from "./permisosService.js";
import { conflicto, datosInvalidos, noAutorizado, noEncontrado } from "../utils/customError.js";
import { ACCIONES, ESTADOS_TAREA, TIPOS_ACTUALIZACION, TIPOS_NOTIFICACION, esAdmin } from "../utils/constantes.js";
import { mencionadosEnTexto } from "../utils/menciones.js";
import { env } from "../config/env.js";

const idsDe = (responsables) => responsables.map((responsable) => responsable.id_usuario);

const exigirResponsablesIntegrantes = async (id_proyecto, ids_responsables) => {
  for (const id_usuario of ids_responsables) {
    if (!(await proyectosRepository.esIntegrante(id_proyecto, id_usuario))) {
      throw datosInvalidos({ ids_responsables: "Todos los responsables tienen que ser integrantes del proyecto" });
    }
  }
};

const buscarEstado = async (id_etarea, connection) => {
  const estados = await catalogosRepository.estadosTarea(connection);
  const estado = estados.find((e) => e.id_etarea === id_etarea);
  if (!estado) throw datosInvalidos({ id_etarea: "El estado elegido no es válido" });
  return estado;
};

// ───────────── Consulta ─────────────

export const listar = (usuario, filtros) =>
  tareasRepository.listar(
    usuario,
    { ...filtros, id_usuario_responsable: filtros.mias === 1 ? usuario.id_usuario : filtros.id_usuario_responsable },
    { proximas: env.diasAvisoVencimiento, finalizadas: env.diasFinalizadasEnTablero },
  );

export const obtener = async (usuario, id_tarea) => {
  const { tarea, puedeGestionar, puedeActualizar } = await accesoATarea(usuario, id_tarea);
  return { ...tarea, puede_gestionar: puedeGestionar, puede_actualizar: puedeActualizar };
};

// ───────────── Alta y edición (quien gestiona el proyecto) ─────────────

export const crear = async (usuario, datos) => {
  const { proyecto } = await exigirGestionDeProyecto(usuario, datos.id_proyecto);
  exigirProyectoActivo(proyecto);
  await exigirResponsablesIntegrantes(datos.id_proyecto, datos.ids_responsables);

  const estado = await buscarEstado(datos.id_etarea ?? ESTADOS_TAREA.PENDIENTE);
  const finalizada = estado.es_final === 1;

  const id_tarea = await enTransaccion(async (connection) => {
    const id = await tareasRepository.crear(
      {
        ...datos,
        id_etarea: estado.id_etarea,
        porcentaje_avance: finalizada ? 100 : (datos.porcentaje_avance ?? 0),
        finalizada,
        orden: await tareasRepository.siguienteOrden(connection),
        id_usuario_alta: usuario.id_usuario,
      },
      connection,
    );
    await tareasRepository.reemplazarResponsables(id, datos.ids_responsables, usuario.id_usuario, connection);
    await actividadRepository.registrar(
      { id_usuario: usuario.id_usuario, accion: ACCIONES.TAREA_CREADA, id_proyecto: datos.id_proyecto, id_tarea: id, descripcion: `creó la tarea "${datos.titulo}"` },
      connection,
    );
    await notificar(
      {
        destinatarios: datos.ids_responsables,
        id_usuario_origen: usuario.id_usuario,
        id_tnotificacion: TIPOS_NOTIFICACION.TAREA_ASIGNADA,
        id_tarea: id,
        id_proyecto: datos.id_proyecto,
        texto: `Se te asignó la tarea "${datos.titulo}" (${proyecto.nombre_proyecto})`,
      },
      connection,
    );
    return id;
  });
  return obtener(usuario, id_tarea);
};

export const actualizar = async (usuario, id_tarea, datos) => {
  const { tarea, proyecto, puedeGestionar } = await accesoATarea(usuario, id_tarea);
  if (!puedeGestionar) throw noAutorizado("No tenés permiso para editar esta tarea");
  exigirProyectoActivo(proyecto);
  exigirTareaActiva(tarea);

  // Quiénes se suman, quiénes dejan de ser responsables y quiénes siguen: a cada grupo le llega un aviso distinto.
  const antes = idsDe(tarea.responsables);
  const agregados = datos.ids_responsables.filter((id) => !antes.includes(id));
  const quitados = antes.filter((id) => !datos.ids_responsables.includes(id));
  const siguen = datos.ids_responsables.filter((id) => antes.includes(id));
  const reasignada = agregados.length > 0 || quitados.length > 0;
  const cambioVencimiento = datos.fecha_vencimiento !== tarea.fecha_vencimiento;
  await exigirResponsablesIntegrantes(tarea.id_proyecto, agregados);

  await enTransaccion(async (connection) => {
    await tareasRepository.actualizarDatos(id_tarea, datos, connection);
    if (reasignada) await tareasRepository.reemplazarResponsables(id_tarea, datos.ids_responsables, usuario.id_usuario, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: reasignada ? ACCIONES.TAREA_REASIGNADA : ACCIONES.TAREA_EDITADA,
        id_proyecto: tarea.id_proyecto,
        id_tarea,
        descripcion: `${reasignada ? "reasignó" : "editó"} la tarea "${datos.titulo}"`,
      },
      connection,
    );

    const base = { id_usuario_origen: usuario.id_usuario, id_tarea, id_proyecto: tarea.id_proyecto };
    await notificar(
      {
        ...base,
        destinatarios: agregados,
        id_tnotificacion: TIPOS_NOTIFICACION.TAREA_ASIGNADA,
        texto: `Se te asignó la tarea "${datos.titulo}" (${proyecto.nombre_proyecto})`,
      },
      connection,
    );
    await notificar(
      {
        ...base,
        destinatarios: quitados,
        id_tnotificacion: TIPOS_NOTIFICACION.TAREA_MODIFICADA,
        texto: `Ya no sos responsable de la tarea "${datos.titulo}"`,
      },
      connection,
    );
    await notificar(
      {
        ...base,
        destinatarios: siguen,
        id_tnotificacion: cambioVencimiento ? TIPOS_NOTIFICACION.CAMBIO_VENCIMIENTO : TIPOS_NOTIFICACION.TAREA_MODIFICADA,
        texto: cambioVencimiento ? `Cambió la fecha de entrega de la tarea "${datos.titulo}"` : `Se modificó la tarea "${datos.titulo}"`,
      },
      connection,
    );
  });
  return obtener(usuario, id_tarea);
};

export const archivar = async (usuario, id_tarea, archivada) => {
  const { tarea, proyecto, puedeGestionar } = await accesoATarea(usuario, id_tarea);
  if (!puedeGestionar) throw noAutorizado("No tenés permiso para archivar esta tarea");
  exigirProyectoActivo(proyecto);
  if (tarea.archivada === archivada) return obtener(usuario, id_tarea);

  await enTransaccion(async (connection) => {
    await tareasRepository.archivar(id_tarea, archivada, connection);
    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: archivada === 1 ? ACCIONES.TAREA_ARCHIVADA : ACCIONES.TAREA_DESARCHIVADA,
        id_proyecto: tarea.id_proyecto,
        id_tarea,
        descripcion: `${archivada === 1 ? "archivó" : "desarchivó"} la tarea "${tarea.titulo}"`,
      },
      connection,
    );
  });
  return obtener(usuario, id_tarea);
};

// ───────────── Seguimiento (quien gestiona o cualquier responsable) ─────────────

// Aplica un cambio de estado y/o avance con su comentario, y deja el registro en el historial.
// Es el único camino por el que cambian tarea.id_etarea y tarea.porcentaje_avance,
// así el historial nunca queda desfasado de la tarea.
const aplicarSeguimiento = async (connection, usuario, tarea, { id_tactualizacion, id_etarea, porcentaje_avance, comentario }) => {
  const estadoNuevo = await buscarEstado(id_etarea ?? tarea.id_etarea, connection);
  const cambiaEstado = estadoNuevo.id_etarea !== tarea.id_etarea;

  // Una tarea finalizada siempre queda en 100 %.
  const porcentajeNuevo = estadoNuevo.es_final === 1 ? 100 : (porcentaje_avance ?? tarea.porcentaje_avance);
  const cambiaPorcentaje = porcentajeNuevo !== tarea.porcentaje_avance;

  if (!cambiaEstado && !cambiaPorcentaje && !comentario) {
    throw datosInvalidos({ comentario: "No hay ningún cambio para registrar" });
  }

  if (cambiaEstado || cambiaPorcentaje) {
    await tareasRepository.actualizarSeguimiento(
      tarea.id_tarea,
      { id_etarea: estadoNuevo.id_etarea, porcentaje_avance: porcentajeNuevo, esFinal: estadoNuevo.es_final === 1 },
      connection,
    );
  }

  await tareasRepository.insertarActualizacion(
    {
      id_tarea: tarea.id_tarea,
      id_usuario: usuario.id_usuario,
      id_tactualizacion,
      id_etarea_anterior: cambiaEstado ? tarea.id_etarea : null,
      id_etarea_nuevo: cambiaEstado ? estadoNuevo.id_etarea : null,
      porcentaje_anterior: cambiaPorcentaje ? tarea.porcentaje_avance : null,
      porcentaje_nuevo: cambiaPorcentaje ? porcentajeNuevo : null,
      comentario,
    },
    connection,
  );

  // `descripcion` va a la bitácora (se muestra después del nombre de quien lo hizo);
  // `aviso` es la misma novedad redactada para la notificación.
  let accion = ACCIONES.TAREA_NOVEDAD;
  let descripcion = `registró una novedad en la tarea "${tarea.titulo}"`;
  let aviso = `Hay una novedad en la tarea "${tarea.titulo}"`;
  if (id_tactualizacion === TIPOS_ACTUALIZACION.DIFICULTAD) {
    descripcion = `informó una dificultad en la tarea "${tarea.titulo}"`;
    aviso = `Se informó una dificultad en la tarea "${tarea.titulo}"`;
  }
  if (cambiaEstado) {
    accion = ACCIONES.TAREA_ESTADO;
    descripcion = `pasó la tarea "${tarea.titulo}" a ${estadoNuevo.nombre_etarea}`;
    aviso = `La tarea "${tarea.titulo}" pasó a ${estadoNuevo.nombre_etarea}`;
  } else if (cambiaPorcentaje) {
    accion = ACCIONES.TAREA_AVANCE;
    descripcion = `actualizó el avance de la tarea "${tarea.titulo}" al ${porcentajeNuevo} %`;
    aviso = `El avance de la tarea "${tarea.titulo}" pasó al ${porcentajeNuevo} %`;
  }
  await actividadRepository.registrar(
    { id_usuario: usuario.id_usuario, accion, id_proyecto: tarea.id_proyecto, id_tarea: tarea.id_tarea, descripcion },
    connection,
  );

  // Se enteran quien creó la tarea y los demás responsables (notificar() nunca le avisa a quien hizo el cambio).
  const responsables = idsDe(tarea.responsables);
  const esResponsable = responsables.includes(usuario.id_usuario);
  await notificar(
    {
      destinatarios: [tarea.id_usuario_alta, ...responsables],
      id_usuario_origen: usuario.id_usuario,
      id_tnotificacion: esResponsable ? TIPOS_NOTIFICACION.AVANCE_REGISTRADO : TIPOS_NOTIFICACION.TAREA_MODIFICADA,
      id_tarea: tarea.id_tarea,
      id_proyecto: tarea.id_proyecto,
      texto: aviso,
    },
    connection,
  );
};

const exigirPuedeActualizar = async (usuario, id_tarea) => {
  const acceso = await accesoATarea(usuario, id_tarea);
  if (!acceso.puedeActualizar) throw noAutorizado("Solo un responsable o quien gestiona el proyecto puede actualizar esta tarea");
  exigirProyectoActivo(acceso.proyecto);
  exigirTareaActiva(acceso.tarea);
  return acceso;
};

export const registrarActualizacion = async (usuario, id_tarea, datos) => {
  const { tarea } = await exigirPuedeActualizar(usuario, id_tarea);
  await enTransaccion((connection) => aplicarSeguimiento(connection, usuario, tarea, datos));
  return obtener(usuario, id_tarea);
};

export const listarActualizaciones = async (usuario, id_tarea) => {
  await accesoATarea(usuario, id_tarea);
  return tareasRepository.listarActualizaciones(id_tarea);
};

// Drag and drop del tablero: cambia el estado (si se soltó en otra columna) y la posición.
// `ids_columna` es la columna de destino tal como quedó en pantalla, de arriba hacia abajo.
export const mover = async (usuario, id_tarea, { id_etarea, ids_columna }) => {
  const { tarea } = await exigirPuedeActualizar(usuario, id_tarea);

  await enTransaccion(async (connection) => {
    if (id_etarea !== tarea.id_etarea) {
      await aplicarSeguimiento(connection, usuario, tarea, { id_tactualizacion: TIPOS_ACTUALIZACION.CAMBIO_ESTADO, id_etarea });
    }
    if (ids_columna) await reordenarColumna(connection, usuario, id_tarea, id_etarea, ids_columna);
  });
  return obtener(usuario, id_tarea);
};

// Reparte entre las tarjetas de la columna los mismos valores de `orden` que ya tenían, en el orden nuevo.
// Como solo se permutan valores existentes, no se pisa el orden de las tarjetas que el usuario no ve.
const reordenarColumna = async (connection, usuario, id_tarea, id_etarea, ids_columna) => {
  if (!ids_columna.includes(id_tarea)) throw datosInvalidos({ ids_columna: "La columna tiene que incluir la tarea que se movió" });

  const filas = await tareasRepository.obtenerOrdenes(ids_columna, connection);
  if (filas.length !== ids_columna.length || filas.some((fila) => fila.id_etarea !== id_etarea)) {
    throw conflicto("El tablero cambió mientras movías la tarjeta: actualizá la página");
  }

  if (!esAdmin(usuario)) {
    const proyectos = [...new Set(filas.map((fila) => fila.id_proyecto))];
    for (const id_proyecto of proyectos) {
      if (!(await proyectosRepository.esIntegrante(id_proyecto, usuario.id_usuario, connection))) {
        throw noAutorizado("La columna incluye tareas de un proyecto al que no tenés acceso");
      }
    }
  }

  const ordenes = filas.map((fila) => fila.orden).sort((a, b) => a - b);
  for (const [posicion, id] of ids_columna.entries()) {
    await tareasRepository.actualizarOrden(id, ordenes[posicion], connection);
  }
};

// ───────────── Comentarios ─────────────

export const listarComentarios = async (usuario, id_tarea) => {
  await accesoATarea(usuario, id_tarea);
  return tareasRepository.listarComentarios(id_tarea);
};

// De los ids que manda el front, quedan solo los usuarios habilitados cuyo "@Nombre Apellido"
// figura de verdad en el texto (ver utils/menciones.js).
const resolverMenciones = async (comentario, ids_mencionados) => {
  if (ids_mencionados.length === 0) return [];
  return mencionadosEnTexto(comentario, await usuariosRepository.obtenerHabilitados(ids_mencionados));
};

// Puede comentar cualquier integrante del proyecto. Con @ se etiqueta a cualquier usuario:
// recibe una notificación (y un mail, si EMAIL_ACTIVO) y, si no era integrante del proyecto, se lo suma para que pueda ver la tarea.
export const agregarComentario = async (usuario, id_tarea, { comentario, ids_mencionados }) => {
  const { tarea, proyecto } = await accesoATarea(usuario, id_tarea);
  exigirProyectoActivo(proyecto);
  exigirTareaActiva(tarea);
  const mencionados = await resolverMenciones(comentario, ids_mencionados);
  const idsMencionados = mencionados.map((u) => u.id_usuario);

  await enTransaccion(async (connection) => {
    const id_tarea_comentario = await tareasRepository.insertarComentario({ id_tarea, id_usuario: usuario.id_usuario, comentario }, connection);

    if (mencionados.length > 0) {
      await tareasRepository.insertarMenciones(id_tarea_comentario, idsMencionados, connection);
      for (const mencionado of mencionados) {
        if (await proyectosRepository.esIntegrante(tarea.id_proyecto, mencionado.id_usuario, connection)) continue;
        await proyectosRepository.agregarIntegrante(tarea.id_proyecto, mencionado.id_usuario, usuario.id_usuario, connection);
        await actividadRepository.registrar(
          {
            id_usuario: usuario.id_usuario,
            accion: ACCIONES.INTEGRANTE_AGREGADO,
            id_proyecto: tarea.id_proyecto,
            id_tarea,
            descripcion: `sumó a ${mencionado.nombre_usuario} al proyecto "${proyecto.nombre_proyecto}" al etiquetarlo en un comentario`,
          },
          connection,
        );
      }
      await notificar(
        {
          destinatarios: idsMencionados,
          id_usuario_origen: usuario.id_usuario,
          id_tnotificacion: TIPOS_NOTIFICACION.MENCION,
          id_tarea,
          id_proyecto: tarea.id_proyecto,
          texto: `Te mencionaron en un comentario de la tarea "${tarea.titulo}"`,
        },
        connection,
      );
    }

    await actividadRepository.registrar(
      {
        id_usuario: usuario.id_usuario,
        accion: ACCIONES.COMENTARIO_AGREGADO,
        id_proyecto: tarea.id_proyecto,
        id_tarea,
        descripcion: `comentó en la tarea "${tarea.titulo}"`,
      },
      connection,
    );
    // A los mencionados ya les llegó el aviso de la mención: no se les repite el de "comentario nuevo".
    await notificar(
      {
        destinatarios: [...idsDe(tarea.responsables), tarea.id_usuario_alta].filter((id) => !idsMencionados.includes(id)),
        id_usuario_origen: usuario.id_usuario,
        id_tnotificacion: TIPOS_NOTIFICACION.COMENTARIO,
        id_tarea,
        id_proyecto: tarea.id_proyecto,
        texto: `Hay un comentario nuevo en la tarea "${tarea.titulo}"`,
      },
      connection,
    );
  });

  // Ya confirmado el comentario, se avisa también por mail a los etiquetados. Va sin await a propósito
  // (ver emailService): la respuesta no espera al SMTP.
  if (idsMencionados.length > 0) {
    enviarEmailsDeMencion({
      id_usuario_origen: usuario.id_usuario,
      ids_mencionados: idsMencionados,
      id_tarea,
      titulo: tarea.titulo,
      proyecto: proyecto.nombre_proyecto,
      comentario,
    });
  }
  return tareasRepository.listarComentarios(id_tarea);
};

// Solo quien lo escribió o un administrador. Es borrado lógico (habilita = 0).
export const eliminarComentario = async (usuario, id_tarea, id_tarea_comentario) => {
  await accesoATarea(usuario, id_tarea);
  const comentario = await tareasRepository.obtenerComentario(id_tarea_comentario);
  if (!comentario || comentario.id_tarea !== id_tarea) throw noEncontrado("El comentario no existe");
  if (comentario.id_usuario !== usuario.id_usuario && !esAdmin(usuario)) {
    throw noAutorizado("Solo podés eliminar tus propios comentarios");
  }
  await tareasRepository.deshabilitarComentario(id_tarea_comentario);
  return tareasRepository.listarComentarios(id_tarea);
};
