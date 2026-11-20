import { Button, Skeleton } from "@mui/material";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { useNavigate } from "react-router-dom";
import EncabezadoPagina from "../common/EncabezadoPagina";
import BarraAvance from "../components/ui/BarraAvance";
import Bloque from "../components/ui/Bloque";
import { ChipEstadoProyecto, ChipPrioridad } from "../components/ui/Chips";
import { Consulta, EstadoVacio } from "../components/ui/Estados";
import ListaActividad from "../components/ui/ListaActividad";
import { useDatos, useUsuario } from "../context/contextos";
import { useConsulta } from "../hooks/useConsulta";
import { sesionApi } from "../services/api";
import { textoVencimiento } from "../utils/fechas";
import { nombresDeResponsables } from "../utils/opciones";

const Indicador = ({ valor, texto, icono, color, onClick }) => (
  <button type="button" className={`cd-superficie org-indicador org-color--${color}`} onClick={onClick}>
    <span className="org-indicador__icono">{icono}</span>
    <span className="org-indicador__valor">{valor}</span>
    <span className="org-indicador__texto">{texto}</span>
  </button>
);

// Tareas con su vencimiento (vencidas o próximas). Al tocar una se abre el detalle.
export const ListaVencimientos = ({ tareas, vacio, claseFecha }) => {
  const { abrirTarea } = useDatos();
  if (tareas.length === 0) return <EstadoVacio titulo={vacio} icono={<TaskAltRoundedIcon />} />;
  return (
    <ul className="org-lista">
      {tareas.map((tarea) => (
        <li key={tarea.id_tarea}>
          <button type="button" className="org-lista__item org-lista__item--accion" onClick={() => abrirTarea(tarea.id_tarea)}>
            <span className="org-lista__cuerpo">
              <span className="org-lista__texto">{tarea.titulo}</span>
              <span className="org-lista__meta">
                {tarea.nombre_proyecto} · {nombresDeResponsables(tarea.responsables)} · <span className={claseFecha}>{textoVencimiento(tarea)}</span>
              </span>
            </span>
            <ChipPrioridad id={tarea.id_prioridad} nombre={tarea.nombre_prioridad} />
          </button>
        </li>
      ))}
    </ul>
  );
};

export const AvanceDeProyectos = ({ proyectos }) => {
  const navigate = useNavigate();
  if (proyectos.length === 0) return <EstadoVacio titulo="Todavía no hay proyectos" />;
  return (
    <ul className="org-lista">
      {proyectos.map((proyecto) => (
        <li key={proyecto.id_proyecto}>
          <button
            type="button"
            className="org-lista__item org-lista__item--accion"
            onClick={() => navigate(`/proyectos/${proyecto.id_proyecto}`)}
          >
            <span className="org-lista__cuerpo">
              <span className="org-lista__texto">{proyecto.nombre_proyecto}</span>
              <span className="org-lista__meta">
                {proyecto.tareas_finalizadas} de {proyecto.total_tareas} tareas finalizadas
              </span>
              <BarraAvance valor={proyecto.avance} />
            </span>
            <ChipEstadoProyecto id={proyecto.id_eproyecto} nombre={proyecto.nombre_eproyecto} />
          </button>
        </li>
      ))}
    </ul>
  );
};

const PanelEsqueleto = () => (
  <div aria-busy="true">
    <div className="org-indicadores">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Skeleton key={n} variant="rounded" animation="wave" height={118} />
      ))}
    </div>
    <div className="org-grilla">
      <Skeleton variant="rounded" animation="wave" height={280} />
      <Skeleton variant="rounded" animation="wave" height={280} />
    </div>
  </div>
);

// Panel principal. El back decide qué se cuenta según el rol:
//   vista "equipo"   (administradores y supervisores) -> todas las tareas de sus proyectos
//   vista "personal" (colaboradores)                  -> las tareas que tienen asignadas
const Inicio = () => {
  const { usuario } = useUsuario();
  const navigate = useNavigate();
  const consulta = useConsulta(() => sesionApi.dashboard(), []);

  return (
    <main className="org-pagina">
      <EncabezadoPagina
        sup="Inicio"
        titulo={`Hola, ${usuario.nombre_persona}`}
        subtitulo="Un resumen de lo que está pasando en tus proyectos."
        acciones={
          <Button variant="outlined" onClick={() => navigate("/tablero")}>
            Ir al tablero
          </Button>
        }
      />

      <Consulta consulta={consulta} esqueleto={<PanelEsqueleto />}>
        {(panel) => {
          const equipo = panel.vista === "equipo";
          const r = panel.resumen;
          return (
            <>
              <div className="org-indicadores">
                <Indicador
                  valor={r.proyectos_activos}
                  texto={equipo ? "Proyectos activos" : "Proyectos en los que participo"}
                  icono={<FolderRoundedIcon />}
                  color="azul"
                  onClick={() => navigate("/proyectos")}
                />
                <Indicador
                  valor={r.pendientes}
                  texto={equipo ? "Tareas pendientes" : "Mis tareas pendientes"}
                  icono={<RadioButtonUncheckedRoundedIcon />}
                  color="gris"
                  onClick={() => navigate("/tablero")}
                />
                <Indicador
                  valor={r.en_progreso}
                  texto={equipo ? "En progreso" : "Mis tareas en progreso"}
                  icono={<AutorenewRoundedIcon />}
                  color="azul"
                  onClick={() => navigate("/tablero")}
                />
                {equipo && (
                  <Indicador
                    valor={r.finalizadas}
                    texto="Finalizadas"
                    icono={<TaskAltRoundedIcon />}
                    color="verde"
                    onClick={() => navigate("/tablero")}
                  />
                )}
                {r.bloqueadas > 0 && (
                  <Indicador valor={r.bloqueadas} texto="Bloqueadas" icono={<BlockRoundedIcon />} color="rojo" onClick={() => navigate("/tablero")} />
                )}
                <Indicador
                  valor={r.vencidas}
                  texto={equipo ? "Vencidas" : "Mis tareas vencidas"}
                  icono={<WarningAmberRoundedIcon />}
                  color={r.vencidas > 0 ? "rojo" : "gris"}
                  onClick={() => navigate("/tareas")}
                />
                <Indicador
                  valor={r.proximas_a_vencer}
                  texto={`Vencen en ${panel.dias_proximas} días o menos`}
                  icono={<ScheduleRoundedIcon />}
                  color={r.proximas_a_vencer > 0 ? "naranja" : "gris"}
                  onClick={() => navigate("/tareas")}
                />
              </div>

              <div className="org-grilla">
                <Bloque titulo={equipo ? "Tareas vencidas" : "Mis tareas vencidas"}>
                  <ListaVencimientos tareas={panel.tareas_vencidas} vacio="No hay tareas vencidas" claseFecha="org-vencida" />
                </Bloque>
                <Bloque titulo={equipo ? "Próximas a vencer" : "Próximas fechas de entrega"}>
                  <ListaVencimientos tareas={panel.tareas_proximas} vacio="No hay vencimientos cercanos" claseFecha="org-proxima" />
                </Bloque>
                <Bloque titulo={equipo ? "Avance de los proyectos" : "Proyectos en los que participo"}>
                  <AvanceDeProyectos proyectos={panel.proyectos} />
                </Bloque>
                <Bloque titulo={equipo ? "Actividad reciente del equipo" : "Últimas actualizaciones"}>
                  <ListaActividad actividad={panel.actividad} />
                </Bloque>
              </div>
            </>
          );
        }}
      </Consulta>
    </main>
  );
};

export default Inicio;
