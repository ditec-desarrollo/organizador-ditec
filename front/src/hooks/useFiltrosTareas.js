import { useMemo, useState } from "react";
import { FILTROS_TAREA_VACIOS } from "../utils/opciones";
import { useValorDemorado } from "./useValorDemorado";

// Estado de la barra de filtros de tareas.
//   filtros / setFiltros -> lo que se ve en la barra
//   paraApi              -> lo que se manda al back: los fijos de la pantalla (ej. id_proyecto) + los elegidos,
//                           con la búsqueda demorada para no pedir con cada tecla
export const useFiltrosTareas = (fijos) => {
  const [filtros, setFiltros] = useState(FILTROS_TAREA_VACIOS);
  const buscar = useValorDemorado(filtros.buscar.trim());
  const clavesFijos = JSON.stringify(fijos ?? {});

  const paraApi = useMemo(
    () => ({ ...filtros, buscar, ...JSON.parse(clavesFijos) }),
    [filtros, buscar, clavesFijos],
  );

  return { filtros, setFiltros, paraApi };
};

export default useFiltrosTareas;
