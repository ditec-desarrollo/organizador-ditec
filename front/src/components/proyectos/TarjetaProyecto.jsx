import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { mostrarFecha } from "../../utils/fechas";
import BarraAvance from "../ui/BarraAvance";
import { ChipEstadoProyecto, ChipNeutro } from "../ui/Chips";

// Tarjeta de un proyecto en la grilla: estado, avance y un resumen de sus tareas.
const TarjetaProyecto = ({ proyecto, onAbrir }) => (
  <button type="button" className="cd-superficie org-proyecto" onClick={() => onAbrir(proyecto.id_proyecto)}>
    <span className="d-flex flex-wrap gap-2">
      <ChipEstadoProyecto id={proyecto.id_eproyecto} nombre={proyecto.nombre_eproyecto} />
      {proyecto.archivado === 1 && <ChipNeutro>Archivado</ChipNeutro>}
    </span>
    <span className="org-proyecto__nombre">{proyecto.nombre_proyecto}</span>
    {proyecto.descripcion && <span className="org-proyecto__descripcion">{proyecto.descripcion}</span>}
    <BarraAvance valor={proyecto.avance} />
    <span className="org-proyecto__pie">
      <span className="org-dato">
        <TaskAltRoundedIcon />
        {proyecto.tareas_finalizadas}/{proyecto.total_tareas} tareas
      </span>
      <span className="org-dato">
        <GroupOutlinedIcon />
        {proyecto.total_integrantes}
      </span>
      {proyecto.fecha_fin_estimada && (
        <span className="org-dato">
          <EventRoundedIcon />
          {mostrarFecha(proyecto.fecha_fin_estimada)}
        </span>
      )}
      {proyecto.tareas_vencidas > 0 && (
        <span className="org-dato org-dato--alerta">
          <WarningAmberRoundedIcon />
          {proyecto.tareas_vencidas} vencida{proyecto.tareas_vencidas === 1 ? "" : "s"}
        </span>
      )}
    </span>
  </button>
);

export default TarjetaProyecto;
