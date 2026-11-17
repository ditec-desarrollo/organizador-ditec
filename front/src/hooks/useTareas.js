import { useCallback } from "react";
import { useDatos } from "../context/contextos";
import { tareasApi } from "../services/api";
import { avisarError } from "../utils/avisos";
import { useConsulta } from "./useConsulta";

// Tareas según los filtros + la acción de mover una tarjeta del tablero.
export const useTareas = (filtros) => {
  const { refrescar, catalogos } = useDatos();
  const consulta = useConsulta(() => tareasApi.listar(filtros), [JSON.stringify(filtros)]);
  const { datos: tareas, setDatos, recargar } = consulta;

  // Mueve la tarea a la columna `id_etarea`, en la posición `indice` (entre las tarjetas visibles).
  // Primero se actualiza la pantalla y después se guarda; si el back lo rechaza, se vuelve atrás.
  const mover = useCallback(
    async (id_tarea, id_etarea, indice) => {
      const anteriores = tareas;
      const movida = tareas.find((t) => t.id_tarea === id_tarea);
      if (!movida) return;

      const estado = catalogos.estadosTarea.find((e) => e.id_etarea === id_etarea);
      const columna = tareas.filter((t) => t.id_etarea === id_etarea && t.id_tarea !== id_tarea);
      columna.splice(indice, 0, {
        ...movida,
        id_etarea,
        nombre_etarea: estado?.nombre_etarea ?? movida.nombre_etarea,
        es_final: estado?.es_final ?? movida.es_final,
        porcentaje_avance: estado?.es_final === 1 ? 100 : movida.porcentaje_avance,
      });
      const resto = tareas.filter((t) => t.id_etarea !== id_etarea && t.id_tarea !== id_tarea);
      setDatos([...resto, ...columna]);

      try {
        await tareasApi.mover(id_tarea, { id_etarea, ids_columna: columna.map((t) => t.id_tarea) });
        // Avisa al resto de la app (indicadores, historial, notificaciones) que algo cambió.
        refrescar();
      } catch (error) {
        setDatos(anteriores);
        avisarError(error, "No se pudo mover la tarea");
        recargar();
      }
    },
    [tareas, catalogos.estadosTarea, setDatos, refrescar, recargar],
  );

  return { ...consulta, tareas, mover };
};

export default useTareas;
