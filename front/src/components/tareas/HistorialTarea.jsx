import { useConsulta } from "../../hooks/useConsulta";
import { tareasApi } from "../../services/api";
import { claseActualizacion } from "../../utils/estados";
import { mostrarFechaHora } from "../../utils/fechas";
import { Consulta, EstadoVacio } from "../ui/Estados";

// Línea de tiempo con todas las actualizaciones de la tarea, de la más nueva a la más vieja.
const HistorialTarea = ({ idTarea }) => {
  const consulta = useConsulta(() => tareasApi.actualizaciones(idTarea), [idTarea]);

  return (
    <Consulta consulta={consulta}>
      {(actualizaciones) =>
        actualizaciones.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay actualizaciones" texto="Cuando alguien informe un avance o cambie el estado, va a aparecer acá." />
        ) : (
          <ol className="org-historial">
            {actualizaciones.map((a) => (
              <li key={a.id_tarea_actualizacion} className={`org-historial__item ${claseActualizacion(a.id_tactualizacion)}`}>
                <div className="org-historial__cabecera">
                  <strong>{a.nombre_usuario}</strong>
                  <span>{a.nombre_tactualizacion}</span>
                  <span>· {mostrarFechaHora(a.fecha_alta)}</span>
                </div>
                {a.id_etarea_nuevo && (
                  <p className="org-historial__cambio">
                    Estado: {a.nombre_etarea_anterior} → <strong>{a.nombre_etarea_nuevo}</strong>
                  </p>
                )}
                {a.porcentaje_nuevo !== null && (
                  <p className="org-historial__cambio">
                    Avance: {a.porcentaje_anterior} % → <strong>{a.porcentaje_nuevo} %</strong>
                  </p>
                )}
                {a.comentario && (
                  <div className="org-comentario">
                    <p className="org-texto-largo">{a.comentario}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )
      }
    </Consulta>
  );
};

export default HistorialTarea;
