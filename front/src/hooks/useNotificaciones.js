import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDatos } from "../context/contextos";
import { notificacionesApi } from "../services/api";
import { avisarError } from "../utils/avisos";

// Acciones sobre las notificaciones, compartidas por la campana del header y la pantalla de notificaciones.
export const useNotificaciones = () => {
  const { setNoLeidas, abrirTarea, refrescar } = useDatos();
  const navigate = useNavigate();

  // Marca como leída y lleva a lo que la notificación señala (la tarea o, si no hay, el proyecto).
  const elegir = useCallback(
    async (notificacion) => {
      try {
        if (notificacion.leida === 0) {
          const resumen = await notificacionesApi.marcarLeida(notificacion.id_notificacion);
          setNoLeidas(resumen.no_leidas);
          refrescar();
        }
      } catch (error) {
        avisarError(error);
      }
      if (notificacion.id_tarea) abrirTarea(notificacion.id_tarea);
      else if (notificacion.id_proyecto) navigate(`/proyectos/${notificacion.id_proyecto}`);
    },
    [setNoLeidas, abrirTarea, refrescar, navigate],
  );

  const marcarTodas = useCallback(async () => {
    try {
      const resumen = await notificacionesApi.marcarTodas();
      setNoLeidas(resumen.no_leidas);
      refrescar();
    } catch (error) {
      avisarError(error);
    }
  }, [setNoLeidas, refrescar]);

  return { elegir, marcarTodas };
};

export default useNotificaciones;
