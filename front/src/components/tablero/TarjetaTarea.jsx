import EventRoundedIcon from "@mui/icons-material/EventRounded";
import { clasePrioridad } from "../../utils/estados";
import { alertaVencimiento, textoVencimiento } from "../../utils/fechas";
import AvatarUsuario from "../ui/AvatarUsuario";
import BarraAvance from "../ui/BarraAvance";
import { ChipPrioridad } from "../ui/Chips";

const CLASE_VENCIMIENTO = { vencida: "org-dato--alerta", proxima: "org-dato--aviso" };

// Tarjeta del tablero. El borde izquierdo toma el color de la prioridad.
// `arrastre` son las props que entrega @hello-pangea/dnd (ref, draggableProps, dragHandleProps).
const TarjetaTarea = ({ tarea, mostrarProyecto, onAbrir, arrastre, arrastrando = false, fija = false }) => (
  <article
    ref={arrastre?.innerRef}
    {...arrastre?.draggableProps}
    {...arrastre?.dragHandleProps}
    className={`org-tarjeta ${clasePrioridad(tarea.id_prioridad)}${arrastrando ? " org-tarjeta--arrastrando" : ""}${fija ? " org-tarjeta--fija" : ""}`}
    onClick={() => onAbrir(tarea.id_tarea)}
    onKeyDown={(evento) => {
      // Enter abre el detalle; la barra espaciadora queda para arrastrar con el teclado.
      if (evento.key === "Enter") onAbrir(tarea.id_tarea);
    }}
    tabIndex={0}
    aria-label={`Tarea: ${tarea.titulo}`}
  >
    <div>
      <h4 className="org-tarjeta__titulo">{tarea.titulo}</h4>
      {mostrarProyecto && <p className="org-tarjeta__proyecto">{tarea.nombre_proyecto}</p>}
    </div>

    <div className="org-tarjeta__fila">
      <ChipPrioridad id={tarea.id_prioridad} nombre={tarea.nombre_prioridad} />
      <span className={`org-dato ${CLASE_VENCIMIENTO[alertaVencimiento(tarea)] ?? ""}`}>
        <EventRoundedIcon />
        {textoVencimiento(tarea)}
      </span>
    </div>

    <BarraAvance valor={tarea.porcentaje_avance} />

    <div className="org-tarjeta__fila">
      <span className="org-tarjeta__responsable">
        <AvatarUsuario nombre={tarea.nombre_responsable} tamano={22} />
        <span>{tarea.nombre_responsable || "Sin asignar"}</span>
      </span>
    </div>
  </article>
);

export default TarjetaTarea;
