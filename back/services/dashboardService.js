import * as dashboardRepository from "../repositories/dashboardRepository.js";
import * as proyectosRepository from "../repositories/proyectosRepository.js";
import * as tareasRepository from "../repositories/tareasRepository.js";
import * as actividadRepository from "../repositories/actividadRepository.js";
import { esGestor } from "../utils/constantes.js";
import { env } from "../config/env.js";

// Panel principal. Administradores y supervisores ven el estado del equipo
// (todas las tareas de los proyectos que pueden ver); el colaborador ve lo suyo.
export const obtener = async (usuario) => {
  const gestor = esGestor(usuario);
  const soloMias = !gestor;
  const diasProximas = env.diasAvisoVencimiento;
  const filtroResponsable = soloMias ? { id_usuario_responsable: usuario.id_usuario } : {};

  const [resumen, proyectosActivos, proyectos, vencidas, proximas, actividad] = await Promise.all([
    dashboardRepository.resumenTareas(usuario, { soloMias, diasProximas }),
    dashboardRepository.contarProyectosActivos(usuario),
    proyectosRepository.listar(usuario, {}),
    tareasRepository.listar(usuario, { ...filtroResponsable, vencimiento: "vencidas", ordenar: "vencimiento", limite: 10 }, diasProximas),
    tareasRepository.listar(usuario, { ...filtroResponsable, vencimiento: "proximas", ordenar: "vencimiento", limite: 10 }, diasProximas),
    // El colaborador ve las últimas novedades de sus proyectos; el gestor, las de todo lo que gestiona.
    actividadRepository.listar(usuario, { cantidad: 12 }),
  ]);

  return {
    vista: gestor ? "equipo" : "personal",
    dias_proximas: diasProximas,
    resumen: { ...resumen, proyectos_activos: proyectosActivos },
    proyectos,
    tareas_vencidas: vencidas,
    tareas_proximas: proximas,
    actividad,
  };
};
