import { mostrarFechaHora } from "../../utils/fechas";

// Lista de notificaciones. Al tocar una se avisa con onElegir (quien la usa la marca como leída y abre la tarea).
const ListaNotificaciones = ({ notificaciones, onElegir }) => (
  <ul className="org-lista">
    {notificaciones.map((notificacion) => (
      <li key={notificacion.id_notificacion}>
        <button
          type="button"
          className={`org-lista__item org-lista__item--accion${notificacion.leida === 0 ? " org-lista__item--no-leida" : ""}`}
          onClick={() => onElegir(notificacion)}
        >
          <span className={`org-punto${notificacion.leida === 0 ? "" : " org-punto--apagado"}`} aria-hidden="true" />
          <span className="org-lista__cuerpo">
            <span className="org-lista__texto">{notificacion.texto}</span>
            <span className="org-lista__meta">
              {notificacion.nombre_tnotificacion}
              {notificacion.nombre_origen ? ` · ${notificacion.nombre_origen}` : ""} · {mostrarFechaHora(notificacion.fecha_alta)}
              {notificacion.leida === 0 ? " · Sin leer" : ""}
            </span>
          </span>
        </button>
      </li>
    ))}
  </ul>
);

export default ListaNotificaciones;
