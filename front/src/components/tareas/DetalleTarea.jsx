import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tab, Tabs } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import { useDatos } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { tareasApi } from "../../services/api";
import { avisarError, avisarExito, confirmar } from "../../utils/avisos";
import { alertaVencimiento, mostrarFecha, mostrarFechaHora, textoVencimiento } from "../../utils/fechas";
import { nombresDeResponsables } from "../../utils/opciones";
import BarraAvance from "../ui/BarraAvance";
import { ChipEstadoTarea, ChipNeutro, ChipPrioridad } from "../ui/Chips";
import { Consulta } from "../ui/Estados";
import ComentariosTarea from "./ComentariosTarea";
import FormularioActualizacion from "./FormularioActualizacion";
import FormularioTarea from "./FormularioTarea";
import HistorialTarea from "./HistorialTarea";

const CLASE_VENCIMIENTO = { vencida: "org-vencida", proxima: "org-proxima" };

const FichaTarea = ({ tarea }) => (
  <dl className="org-ficha">
    <div>
      <dt>Proyecto</dt>
      <dd>{tarea.nombre_proyecto}</dd>
    </div>
    <div>
      <dt>Responsables</dt>
      <dd>{nombresDeResponsables(tarea.responsables)}</dd>
    </div>
    <div>
      <dt>Vencimiento</dt>
      <dd className={CLASE_VENCIMIENTO[alertaVencimiento(tarea)] ?? ""}>{textoVencimiento(tarea)}</dd>
    </div>
    <div>
      <dt>Inicio</dt>
      <dd>{mostrarFecha(tarea.fecha_inicio)}</dd>
    </div>
    <div>
      <dt>Finalización</dt>
      <dd>{mostrarFechaHora(tarea.fecha_finalizacion)}</dd>
    </div>
    <div>
      <dt>Creada por</dt>
      <dd>
        {tarea.nombre_creador} · {mostrarFecha(tarea.fecha_alta)}
      </dd>
    </div>
  </dl>
);

// Detalle de una tarea: datos, seguimiento, historial y comentarios.
// Lo monta LayoutPrincipal cuando la URL trae ?tarea=<id>, así se abre desde cualquier pantalla.
const DetalleTarea = ({ idTarea, onCerrar }) => {
  const { refrescar } = useDatos();
  const consulta = useConsulta(() => tareasApi.obtener(idTarea), [idTarea]);
  const [pestana, setPestana] = useState("seguimiento");
  const [editando, setEditando] = useState(false);
  const tarea = consulta.datos;

  const archivar = async () => {
    const archivada = tarea.archivada === 1 ? 0 : 1;
    const ok = await confirmar({
      titulo: archivada ? "¿Archivar la tarea?" : "¿Desarchivar la tarea?",
      texto: archivada ? "Deja de aparecer en el tablero y en las listas. Se puede desarchivar después." : "Vuelve a aparecer en el tablero y en las listas.",
      botonConfirmar: archivada ? "Archivar" : "Desarchivar",
    });
    if (!ok) return;
    try {
      await tareasApi.archivar(idTarea, archivada);
      avisarExito(archivada ? "Tarea archivada" : "Tarea desarchivada");
      refrescar();
    } catch (error) {
      avisarError(error);
    }
  };

  const soloLectura = tarea && (tarea.archivada === 1 || tarea.proyecto_archivado === 1);

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{tarea?.titulo ?? "Tarea"}</span>
        <IconButton size="small" onClick={onCerrar} aria-label="Cerrar">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Consulta consulta={consulta}>
          {(t) => (
            <div className="d-flex flex-column gap-4">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <ChipEstadoTarea id={t.id_etarea} nombre={t.nombre_etarea} />
                <ChipPrioridad id={t.id_prioridad} nombre={`Prioridad ${t.nombre_prioridad.toLowerCase()}`} />
                {t.archivada === 1 && <ChipNeutro>Archivada</ChipNeutro>}
                {t.proyecto_archivado === 1 && <ChipNeutro>Proyecto archivado</ChipNeutro>}
                <div style={{ flex: "1 1 180px" }}>
                  <BarraAvance valor={t.porcentaje_avance} />
                </div>
              </div>

              <FichaTarea tarea={t} />

              {t.descripcion && (
                <div>
                  <h3 className="org-seccion">Descripción</h3>
                  <p className="org-texto-largo">{t.descripcion}</p>
                </div>
              )}

              <div>
                <Tabs value={pestana} onChange={(_, valor) => setPestana(valor)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2 }}>
                  <Tab value="seguimiento" label="Seguimiento" />
                  <Tab value="historial" label="Historial" />
                  <Tab value="comentarios" label="Comentarios" />
                </Tabs>

                {pestana === "seguimiento" &&
                  (t.puede_actualizar && !soloLectura ? (
                    <FormularioActualizacion key={`${t.id_etarea}-${t.porcentaje_avance}`} tarea={t} onGuardada={refrescar} />
                  ) : (
                    <p className="org-lista__meta">
                      {soloLectura
                        ? "La tarea está archivada: no admite actualizaciones."
                        : "Solo los responsables de la tarea o quien gestiona el proyecto pueden registrar avances."}
                    </p>
                  ))}
                {pestana === "historial" && <HistorialTarea idTarea={idTarea} />}
                {pestana === "comentarios" && <ComentariosTarea idTarea={idTarea} idProyecto={t.id_proyecto} puedeComentar={!soloLectura} />}
              </div>
            </div>
          )}
        </Consulta>
      </DialogContent>

      {tarea?.puede_gestionar && tarea.proyecto_archivado !== 1 && (
        <DialogActions sx={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
          {tarea.archivada !== 1 && (
            <Button startIcon={<EditRoundedIcon />} onClick={() => setEditando(true)}>
              Editar
            </Button>
          )}
          <Button startIcon={tarea.archivada === 1 ? <UnarchiveOutlinedIcon /> : <ArchiveOutlinedIcon />} onClick={archivar}>
            {tarea.archivada === 1 ? "Desarchivar" : "Archivar"}
          </Button>
        </DialogActions>
      )}

      {editando && (
        <FormularioTarea
          tarea={tarea}
          onCerrar={() => setEditando(false)}
          onGuardada={() => {
            setEditando(false);
            refrescar();
          }}
        />
      )}
    </Dialog>
  );
};

export default DetalleTarea;
