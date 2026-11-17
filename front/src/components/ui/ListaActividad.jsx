import { useDatos } from "../../context/contextos";
import { mostrarFechaHora } from "../../utils/fechas";
import AvatarUsuario from "./AvatarUsuario";
import { EstadoVacio } from "./Estados";

// Actividad reciente (registro_actividad): quién hizo qué y cuándo.
// Si el registro es de una tarea, al tocarlo se abre su detalle.
const ListaActividad = ({ actividad, mostrarProyecto = true }) => {
  const { abrirTarea } = useDatos();

  if (actividad.length === 0) return <EstadoVacio titulo="Todavía no hay actividad" />;

  return (
    <ul className="org-lista">
      {actividad.map((registro) => {
        const contenido = (
          <>
            <AvatarUsuario nombre={registro.nombre_usuario} tamano={28} />
            <span className="org-lista__cuerpo">
              <span className="org-lista__texto">
                <strong>{registro.nombre_usuario}</strong> {registro.descripcion}
              </span>
              <span className="org-lista__meta">
                {mostrarProyecto && registro.nombre_proyecto ? `${registro.nombre_proyecto} · ` : ""}
                {mostrarFechaHora(registro.fecha_alta)}
              </span>
            </span>
          </>
        );
        return (
          <li key={registro.id_registro_actividad}>
            {registro.id_tarea ? (
              <button type="button" className="org-lista__item org-lista__item--accion" onClick={() => abrirTarea(registro.id_tarea)}>
                {contenido}
              </button>
            ) : (
              <div className="org-lista__item" style={{ padding: "10px 8px" }}>
                {contenido}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default ListaActividad;
