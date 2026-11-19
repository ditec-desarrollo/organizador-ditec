import { useMemo, useState } from "react";
import { FILTROS_TAREA_VACIOS } from "../utils/opciones";
import { useValorDemorado } from "./useValorDemorado";

// "2026-11" -> primer y último día de ese mes, como los espera el back.
const rangoDelMes = (mes) => {
  const [anio, numero] = mes.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return { finalizada_desde: `${mes}-01`, finalizada_hasta: `${mes}-${String(ultimoDia).padStart(2, "0")}` };
};

// Estado de la barra de filtros de tareas.
//   fijos     -> lo que esa pantalla siempre pide (ej. { id_proyecto } o { tablero: 1 })
//   iniciales -> filtros que arrancan elegidos (ej. el proyecto que viene en la URL)
// Devuelve:
//   filtros / setFiltros -> lo que se ve en la barra
//   paraApi              -> lo que se manda al back: los fijos + los elegidos, con la búsqueda demorada
//                           (para no pedir con cada tecla) y el mes convertido en un rango de fechas
export const useFiltrosTareas = (fijos, iniciales) => {
  const [filtros, setFiltros] = useState({ ...FILTROS_TAREA_VACIOS, ...iniciales });
  const buscar = useValorDemorado(filtros.buscar.trim());
  const clavesFijos = JSON.stringify(fijos ?? {});

  const paraApi = useMemo(() => {
    const { mes, ...resto } = filtros;
    return { ...resto, buscar, ...(mes ? rangoDelMes(mes) : {}), ...JSON.parse(clavesFijos) };
  }, [filtros, buscar, clavesFijos]);

  return { filtros, setFiltros, paraApi };
};

export default useFiltrosTareas;
