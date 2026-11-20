import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton } from "@mui/material";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import BarraAvance from "../components/ui/BarraAvance";
import { ChipEstadoProyecto, ChipPrioridad } from "../components/ui/Chips";
import { Consulta } from "../components/ui/Estados";
import ListaActividad from "../components/ui/ListaActividad";
import { useDatos } from "../context/contextos";
import { useConsulta } from "../hooks/useConsulta";
import { sesionApi } from "../services/api";
import { mostrarFechaHora, textoVencimiento } from "../utils/fechas";
import { nombresDeResponsables } from "../utils/opciones";
import { AvanceDeProyectos, ListaVencimientos } from "./Inicio";

const CADA_UN_MINUTO = 60 * 1000;
// Cuando una lista no entra entera, va pasando de página sola: nadie toca una tele.
const CADA_PAGINA = 12 * 1000;

const hora = (fecha) => fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Reloj de la cabecera.
const useAhora = () => {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 15 * 1000);
    return () => clearInterval(intervalo);
  }, []);
  return ahora;
};

// Pantalla completa del navegador. Mientras dura se oculta el header (clase en <body>),
// así el panel ocupa toda la tele. Se sale con el mismo botón o con Esc.
const usePantallaCompleta = () => {
  const [completa, setCompleta] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const alCambiar = () => setCompleta(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("org-tv-completa", completa);
    return () => document.body.classList.remove("org-tv-completa");
  }, [completa]);

  // Al irse de la pantalla se sale de la pantalla completa.
  useEffect(
    () => () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    },
    [],
  );

  const alternar = () => {
    const pedido = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
    pedido?.catch(() => {});
  };

  return { completa, alternar, disponible: Boolean(document.documentElement.requestFullscreen) };
};

// Cuántas filas entran en el alto disponible de una lista. Todas las filas de una lista miden lo mismo
// (el alto lo fija el CSS), así que alcanza con medir la primera.
const useFilasQueEntran = (total) => {
  const ref = useRef(null);
  const [entran, setEntran] = useState(Math.max(1, total));

  useLayoutEffect(() => {
    const lista = ref.current;
    if (!lista) return;
    const medir = () => {
      const fila = lista.firstElementChild;
      if (!fila) return;
      const alto = fila.getBoundingClientRect().height;
      if (alto > 0) setEntran(Math.max(1, Math.floor((lista.clientHeight + 1) / alto)));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(lista);
    return () => observador.disconnect();
  }, [total]);

  return [ref, entran];
};

// Bloque del panel: muestra las filas que entran sin scroll. Si hay más, rota de página sola
// y ofrece "Ver más", que abre la lista completa.
const BloqueTv = ({ titulo, color, total, items, clave, fila, claseFila = "", vacio, completo }) => {
  const [ref, entran] = useFilasQueEntran(items.length);
  const [pagina, setPagina] = useState(0);
  const [abierto, setAbierto] = useState(false);

  const paginas = Math.max(1, Math.ceil(items.length / entran));
  const actual = pagina % paginas;
  const visibles = items.slice(actual * entran, actual * entran + entran);

  useEffect(() => {
    if (paginas <= 1 || abierto) return;
    const intervalo = setInterval(() => setPagina((p) => p + 1), CADA_PAGINA);
    return () => clearInterval(intervalo);
  }, [paginas, abierto]);

  return (
    <section className={`cd-superficie org-tv-bloque org-color--${color}`}>
      <header className="org-tv-bloque__cabecera">
        <h2 className="org-tv-bloque__titulo">{titulo}</h2>
        <span className="org-tv-bloque__total">{total ?? items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="org-tv-vacio">{vacio}</p>
      ) : (
        <ul className="org-tv-lista" ref={ref}>
          {visibles.map((item) => (
            <li key={clave(item)} className={`org-tv-fila ${claseFila}`.trim()}>
              {fila(item)}
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <footer className="org-tv-bloque__pie">
          <span aria-live="off">
            {actual * entran + 1}–{actual * entran + visibles.length} de {items.length}
          </span>
          <span className="org-tv-puntos" aria-hidden="true">
            {Array.from({ length: paginas }, (_, i) => (
              <span key={i} className={`org-tv-punto${i === actual ? " org-tv-punto--activo" : ""}`} />
            ))}
          </span>
          <button type="button" className="org-tv-vermas" onClick={() => setAbierto(true)}>
            Ver más
          </button>
        </footer>
      )}

      {abierto && (
        <Dialog open onClose={() => setAbierto(false)} fullWidth maxWidth="md" scroll="paper">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogContent dividers>{completo}</DialogContent>
          <DialogActions>
            <Button onClick={() => setAbierto(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}
    </section>
  );
};

const IndicadorTv = ({ valor, texto, icono, color }) => (
  <div className={`cd-superficie org-tv-indicador org-color--${color}`}>
    <span className="org-tv-indicador__icono">{icono}</span>
    <span className="org-tv-indicador__valor">{valor}</span>
    <span className="org-tv-indicador__texto">{texto}</span>
  </div>
);

const FilaTarea = ({ tarea, claseFecha }) => {
  const { abrirTarea } = useDatos();
  return (
    <button type="button" className="org-tv-fila__boton" onClick={() => abrirTarea(tarea.id_tarea)}>
      <span className="org-tv-fila__cuerpo">
        <span className="org-tv-fila__texto">{tarea.titulo}</span>
        <span className="org-tv-fila__meta">
          <span className={claseFecha}>{textoVencimiento(tarea)}</span> · {tarea.nombre_proyecto} · {nombresDeResponsables(tarea.responsables)}
        </span>
      </span>
      <ChipPrioridad id={tarea.id_prioridad} nombre={tarea.nombre_prioridad} />
    </button>
  );
};

const FilaProyecto = ({ proyecto }) => (
  <div className="org-tv-fila__cuerpo">
    <span className="org-tv-fila__linea">
      <span className="org-tv-fila__texto">{proyecto.nombre_proyecto}</span>
      <ChipEstadoProyecto id={proyecto.id_eproyecto} nombre={proyecto.nombre_eproyecto} />
    </span>
    <span className="org-tv-fila__linea">
      <BarraAvance valor={proyecto.avance} />
      <span className="org-tv-fila__meta org-tv-fila__meta--fija">
        {proyecto.tareas_finalizadas}/{proyecto.total_tareas} tareas
      </span>
    </span>
  </div>
);

const FilaActividad = ({ registro }) => (
  <div className="org-tv-fila__cuerpo">
    <span className="org-tv-fila__texto org-tv-fila__texto--dos">
      <strong>{registro.nombre_usuario}</strong> {registro.descripcion}
    </span>
    <span className="org-tv-fila__meta">
      {registro.nombre_proyecto ? `${registro.nombre_proyecto} · ` : ""}
      {mostrarFechaHora(registro.fecha_alta)}
    </span>
  </div>
);

const PanelEsqueleto = () => (
  <>
    <div className="org-tv-indicadores" aria-busy="true">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Skeleton key={n} variant="rounded" animation="wave" height="100%" sx={{ minHeight: 90 }} />
      ))}
    </div>
    <div className="org-tv-grilla">
      {[1, 2, 3, 4].map((n) => (
        <Skeleton key={n} variant="rounded" animation="wave" height="100%" sx={{ minHeight: 240 }} />
      ))}
    </div>
  </>
);

// El mismo panel que Inicio, armado para una tele (pensado para 55", 1920×1080 o 4K):
// todo entra en una pantalla sin scroll, con letra grande y cuatro listas en columnas.
// Se actualiza solo cada minuto y las listas largas rotan de página.
const InicioTv = () => {
  const consulta = useConsulta(() => sesionApi.dashboard({ amplio: true }), [], { refrescarCada: CADA_UN_MINUTO });
  const pantalla = usePantallaCompleta();
  const ahora = useAhora();

  // Hora de la última vez que llegaron datos.
  const [actualizado, setActualizado] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- registra cuándo llegó la última respuesta
    if (consulta.datos) setActualizado(new Date());
  }, [consulta.datos]);

  return (
    <main className="org-tv">
      <header className="org-tv-cabecera">
        <div className="org-tv-cabecera__titulos">
          <h1 className="org-tv-cabecera__titulo">Panel del Organizador</h1>
          <span className="org-tv-cabecera__sub">
            {consulta.datos?.vista === "personal" ? "Mis proyectos y tareas" : "Estado del equipo"}
            {actualizado && ` · Actualizado ${hora(actualizado)}`}
            {consulta.error && consulta.datos && " · Sin conexión, mostrando los últimos datos"}
          </span>
        </div>
        <span className="org-tv-reloj">
          <span className="org-tv-reloj__hora">{hora(ahora)}</span>
          <span className="org-tv-reloj__fecha">{ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</span>
        </span>
        {pantalla.disponible && (
          <Button
            className="ocultarAlImprimir"
            variant="outlined"
            startIcon={pantalla.completa ? <FullscreenExitRoundedIcon /> : <FullscreenRoundedIcon />}
            onClick={pantalla.alternar}
          >
            {pantalla.completa ? "Salir" : "Pantalla completa"}
          </Button>
        )}
      </header>

      <Consulta consulta={consulta} esqueleto={<PanelEsqueleto />}>
        {(panel) => {
          const equipo = panel.vista === "equipo";
          const r = panel.resumen;
          return (
            <>
              <div className="org-tv-indicadores">
                <IndicadorTv
                  valor={r.proyectos_activos}
                  texto={equipo ? "Proyectos activos" : "Mis proyectos"}
                  icono={<FolderRoundedIcon />}
                  color="azul"
                />
                <IndicadorTv valor={r.pendientes} texto="Pendientes" icono={<RadioButtonUncheckedRoundedIcon />} color="gris" />
                <IndicadorTv valor={r.en_progreso} texto="En progreso" icono={<AutorenewRoundedIcon />} color="azul" />
                {equipo && <IndicadorTv valor={r.finalizadas} texto="Finalizadas" icono={<TaskAltRoundedIcon />} color="verde" />}
                {r.bloqueadas > 0 && <IndicadorTv valor={r.bloqueadas} texto="Bloqueadas" icono={<BlockRoundedIcon />} color="rojo" />}
                <IndicadorTv valor={r.vencidas} texto="Vencidas" icono={<WarningAmberRoundedIcon />} color={r.vencidas > 0 ? "rojo" : "gris"} />
                <IndicadorTv
                  valor={r.proximas_a_vencer}
                  texto={`Vencen en ${panel.dias_proximas} días o menos`}
                  icono={<ScheduleRoundedIcon />}
                  color={r.proximas_a_vencer > 0 ? "naranja" : "gris"}
                />
              </div>

              <div className="org-tv-grilla">
                <BloqueTv
                  titulo={equipo ? "Tareas vencidas" : "Mis tareas vencidas"}
                  color={r.vencidas > 0 ? "rojo" : "gris"}
                  total={r.vencidas}
                  items={panel.tareas_vencidas}
                  clave={(tarea) => tarea.id_tarea}
                  fila={(tarea) => <FilaTarea tarea={tarea} claseFecha="org-vencida" />}
                  vacio="No hay tareas vencidas"
                  completo={<ListaVencimientos tareas={panel.tareas_vencidas} vacio="No hay tareas vencidas" claseFecha="org-vencida" />}
                />
                <BloqueTv
                  titulo={equipo ? "Próximas a vencer" : "Próximas fechas de entrega"}
                  color={r.proximas_a_vencer > 0 ? "naranja" : "gris"}
                  total={r.proximas_a_vencer}
                  items={panel.tareas_proximas}
                  clave={(tarea) => tarea.id_tarea}
                  fila={(tarea) => <FilaTarea tarea={tarea} claseFecha="org-proxima" />}
                  vacio="No hay vencimientos cercanos"
                  completo={<ListaVencimientos tareas={panel.tareas_proximas} vacio="No hay vencimientos cercanos" claseFecha="org-proxima" />}
                />
                <BloqueTv
                  titulo={equipo ? "Avance de los proyectos" : "Proyectos en los que participo"}
                  color="azul"
                  items={panel.proyectos}
                  clave={(proyecto) => proyecto.id_proyecto}
                  fila={(proyecto) => <FilaProyecto proyecto={proyecto} />}
                  vacio="Todavía no hay proyectos"
                  completo={<AvanceDeProyectos proyectos={panel.proyectos} />}
                />
                <BloqueTv
                  titulo={equipo ? "Actividad reciente" : "Últimas actualizaciones"}
                  color="violeta"
                  items={panel.actividad}
                  clave={(registro) => registro.id_registro_actividad}
                  fila={(registro) => <FilaActividad registro={registro} />}
                  claseFila="org-tv-fila--alta"
                  vacio="Todavía no hay actividad"
                  completo={<ListaActividad actividad={panel.actividad} />}
                />
              </div>
            </>
          );
        }}
      </Consulta>
    </main>
  );
};

export default InicioTv;
