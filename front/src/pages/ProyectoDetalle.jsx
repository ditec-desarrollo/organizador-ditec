import { useState } from "react";
import { Button, Skeleton, Tab, Tabs } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import { useParams } from "react-router-dom";
import EncabezadoPagina from "../common/EncabezadoPagina";
import TablaEsqueleto from "../components/Esqueletos/TablaEsqueleto";
import FormularioProyecto from "../components/proyectos/FormularioProyecto";
import IntegrantesProyecto from "../components/proyectos/IntegrantesProyecto";
import Tablero from "../components/tablero/Tablero";
import BotonNuevaTarea from "../components/tareas/BotonNuevaTarea";
import FiltrosTareas from "../components/tareas/FiltrosTareas";
import TablaTareas from "../components/tareas/TablaTareas";
import BarraAvance from "../components/ui/BarraAvance";
import Bloque from "../components/ui/Bloque";
import { ChipEstadoProyecto, ChipNeutro } from "../components/ui/Chips";
import { Consulta } from "../components/ui/Estados";
import ListaActividad from "../components/ui/ListaActividad";
import { useDatos } from "../context/contextos";
import { useConsulta } from "../hooks/useConsulta";
import { useFiltrosTareas } from "../hooks/useFiltrosTareas";
import { useTareas } from "../hooks/useTareas";
import { proyectosApi, sesionApi } from "../services/api";
import { avisarError, avisarExito, confirmar } from "../utils/avisos";
import { mostrarFecha } from "../utils/fechas";

// Tareas del proyecto, en tablero o en lista según la pestaña. Comparten filtros.
const TareasDelProyecto = ({ proyecto, vista }) => {
  const { filtros, setFiltros, paraApi } = useFiltrosTareas({ id_proyecto: proyecto.id_proyecto });
  const consulta = useTareas(paraApi);
  const ocultar = vista === "tablero" ? ["id_proyecto", "id_etarea"] : ["id_proyecto"];

  return (
    <>
      <FiltrosTareas filtros={filtros} onChange={setFiltros} ocultar={ocultar} integrantes={proyecto.integrantes} />
      <Consulta consulta={consulta} esqueleto={<TablaEsqueleto />}>
        {(tareas) =>
          vista === "tablero" ? (
            <Tablero tareas={tareas} onMover={consulta.mover} mostrarProyecto={false} />
          ) : (
            <TablaTareas tareas={tareas} mostrarProyecto={false} />
          )
        }
      </Consulta>
    </>
  );
};

const ActividadDelProyecto = ({ idProyecto }) => {
  const consulta = useConsulta(() => sesionApi.actividad({ id_proyecto: idProyecto, cantidad: 50 }), [idProyecto]);
  return (
    <Bloque titulo="Actividad del proyecto">
      <Consulta consulta={consulta}>{(actividad) => <ListaActividad actividad={actividad} mostrarProyecto={false} />}</Consulta>
    </Bloque>
  );
};

const ProyectoDetalle = () => {
  const idProyecto = Number(useParams().id_proyecto);
  const { refrescar } = useDatos();
  const consulta = useConsulta(() => proyectosApi.obtener(idProyecto), [idProyecto]);
  const [pestana, setPestana] = useState("tablero");
  const [editando, setEditando] = useState(false);

  const archivar = async (proyecto) => {
    const archivado = proyecto.archivado === 1 ? 0 : 1;
    const ok = await confirmar({
      titulo: archivado ? "¿Archivar el proyecto?" : "¿Desarchivar el proyecto?",
      texto: archivado
        ? "El proyecto y sus tareas quedan solo para consulta y dejan de aparecer en el tablero. Se puede desarchivar después."
        : "El proyecto vuelve a estar activo y sus tareas vuelven a aparecer en el tablero.",
      botonConfirmar: archivado ? "Archivar" : "Desarchivar",
    });
    if (!ok) return;
    try {
      await proyectosApi.archivar(idProyecto, archivado);
      avisarExito(archivado ? "Proyecto archivado" : "Proyecto desarchivado");
      refrescar();
    } catch (error) {
      avisarError(error);
    }
  };

  return (
    <main className="org-pagina org-pagina--ancha">
      <Consulta consulta={consulta} esqueleto={<Skeleton variant="rounded" animation="wave" height={320} sx={{ mt: 4 }} />}>
        {(proyecto) => {
          const activo = proyecto.archivado !== 1;
          return (
            <>
              <EncabezadoPagina
                volver="/proyectos"
                sup="Proyecto"
                titulo={proyecto.nombre_proyecto}
                subtitulo={proyecto.descripcion}
                acciones={
                  proyecto.puede_gestionar && (
                    <>
                      {activo && (
                        <Button variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => setEditando(true)}>
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        startIcon={activo ? <ArchiveOutlinedIcon /> : <UnarchiveOutlinedIcon />}
                        onClick={() => archivar(proyecto)}
                      >
                        {activo ? "Archivar" : "Desarchivar"}
                      </Button>
                      {activo && <BotonNuevaTarea idProyecto={idProyecto} />}
                    </>
                  )
                }
              />

              <section className="cd-superficie org-bloque" aria-label="Resumen del proyecto">
                <dl className="org-ficha">
                  <div>
                    <dt>Estado</dt>
                    <dd className="d-flex flex-wrap gap-2">
                      <ChipEstadoProyecto id={proyecto.id_eproyecto} nombre={proyecto.nombre_eproyecto} />
                      {!activo && <ChipNeutro>Archivado</ChipNeutro>}
                    </dd>
                  </div>
                  <div>
                    <dt>Inicio</dt>
                    <dd>{mostrarFecha(proyecto.fecha_inicio)}</dd>
                  </div>
                  <div>
                    <dt>Fin estimado</dt>
                    <dd>{mostrarFecha(proyecto.fecha_fin_estimada)}</dd>
                  </div>
                  <div>
                    <dt>Tareas</dt>
                    <dd>
                      {proyecto.tareas_finalizadas} de {proyecto.total_tareas} finalizadas
                      {proyecto.tareas_vencidas > 0 && <span className="org-vencida">
                          {" "}
                          · {proyecto.tareas_vencidas} vencida{proyecto.tareas_vencidas === 1 ? "" : "s"}
                        </span>}
                    </dd>
                  </div>
                  <div>
                    <dt>Avance general</dt>
                    <dd>
                      <BarraAvance valor={proyecto.avance} />
                    </dd>
                  </div>
                  <div>
                    <dt>Responsables</dt>
                    <dd>{proyecto.nombres_responsables || "Sin definir"}</dd>
                  </div>
                  <div>
                    <dt>Creado por</dt>
                    <dd>{proyecto.nombre_creador}</dd>
                  </div>
                </dl>
              </section>

              <Tabs value={pestana} onChange={(_, valor) => setPestana(valor)} variant="scrollable" allowScrollButtonsMobile sx={{ my: 2 }}>
                <Tab value="tablero" label="Tablero" />
                <Tab value="lista" label="Lista" />
                <Tab value="integrantes" label={`Integrantes (${proyecto.integrantes.length})`} />
                <Tab value="actividad" label="Actividad" />
              </Tabs>

              {(pestana === "tablero" || pestana === "lista") && <TareasDelProyecto proyecto={proyecto} vista={pestana} />}
              {pestana === "integrantes" && <IntegrantesProyecto proyecto={proyecto} />}
              {pestana === "actividad" && <ActividadDelProyecto idProyecto={idProyecto} />}

              {editando && (
                <FormularioProyecto
                  proyecto={proyecto}
                  onCerrar={() => setEditando(false)}
                  onGuardado={() => {
                    setEditando(false);
                    refrescar();
                  }}
                />
              )}
            </>
          );
        }}
      </Consulta>
    </main>
  );
};

export default ProyectoDetalle;
