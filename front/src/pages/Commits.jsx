import { useState } from "react";
import { Button, FormControlLabel, Link, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import EncabezadoPagina from "../common/EncabezadoPagina";
import TablaEsqueleto from "../components/Esqueletos/TablaEsqueleto";
import { Consulta, EstadoVacio } from "../components/ui/Estados";
import { useDatos } from "../context/contextos";
import { useConsulta } from "../hooks/useConsulta";
import { integracionesApi } from "../services/api";
import { avisarError, avisarExito } from "../utils/avisos";
import { mostrarFechaHora } from "../utils/fechas";

// commit_recibido.resultado (los mismos códigos que back/utils/constantes.js).
// `falta` explica qué hay que configurar para que un pendiente se resuelva.
const RESULTADOS = {
  TAREA_CREADA: { texto: "Tarea creada", color: "verde" },
  TAREA_ACTUALIZADA: { texto: "Novedad en tarea", color: "azul" },
  IGNORADO_MERGE: { texto: "Merge (ignorado)", color: "gris" },
  SIN_PROYECTO: { texto: "Falta vincular el repositorio", color: "naranja", falta: "Vinculalo desde la pestaña Repositorios del proyecto." },
  SIN_USUARIO: { texto: "Autor desconocido", color: "naranja", falta: "Cargá esa identidad de git en el usuario que corresponde (Usuarios → Editar)." },
  PROYECTO_ARCHIVADO: { texto: "Proyecto archivado", color: "naranja", falta: "Desarchivá el proyecto y reprocesá." },
};

const primeraLinea = (mensaje) => mensaje.split("\n", 1)[0];

// Commits que avisó Claude Code y qué se hizo con cada uno (solo administradores).
// Sirve sobre todo para ver los que quedaron pendientes y qué falta configurar.
const Commits = () => {
  const { refrescar, abrirTarea } = useDatos();
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [reprocesando, setReprocesando] = useState(false);
  const consulta = useConsulta(() => integracionesApi.commits({ solo_pendientes: soloPendientes ? 1 : "", cantidad: 200 }), [soloPendientes]);

  const reprocesar = async () => {
    setReprocesando(true);
    try {
      const { tareas_creadas, tareas_actualizadas, siguen_pendientes } = await integracionesApi.reprocesar();
      const resueltos = tareas_creadas + tareas_actualizadas;
      avisarExito(resueltos > 0 ? `${resueltos} commit(s) resuelto(s), ${siguen_pendientes} pendiente(s)` : `Sin cambios: ${siguen_pendientes} pendiente(s)`);
      refrescar();
    } catch (error) {
      avisarError(error);
    } finally {
      setReprocesando(false);
    }
  };

  return (
    <main className="org-pagina org-pagina--ancha">
      <EncabezadoPagina
        sup="Administración"
        titulo="Commits"
        subtitulo="Cada commit que hace Claude Code llega acá y se convierte en una tarea del proyecto al que pertenece el repositorio. Los pendientes se resuelven solos cuando se vincula el repositorio o se carga la identidad de git del autor."
        acciones={
          <Button variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={reprocesar} disabled={reprocesando}>
            {reprocesando ? "Reprocesando…" : "Reprocesar pendientes"}
          </Button>
        }
      />

      <div className="cd-superficie org-filtros">
        <FormControlLabel
          control={<Switch checked={soloPendientes} onChange={(evento) => setSoloPendientes(evento.target.checked)} />}
          label="Solo los pendientes"
        />
      </div>

      <Consulta consulta={consulta} esqueleto={<TablaEsqueleto />}>
        {(commits) =>
          commits.length === 0 ? (
            <div className="cd-superficie">
              <EstadoVacio
                titulo={soloPendientes ? "No hay commits pendientes" : "Todavía no llegó ningún commit"}
                texto={soloPendientes ? undefined : "Llegan cuando el hook de Claude Code está instalado en la máquina de quien hace el commit."}
              />
            </div>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Recibido</TableCell>
                    <TableCell>Commit</TableCell>
                    <TableCell>Autor</TableCell>
                    <TableCell>Resultado</TableCell>
                    <TableCell>Proyecto y tarea</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {commits.map((commit) => {
                    const resultado = RESULTADOS[commit.resultado] ?? { texto: commit.resultado, color: "gris" };
                    return (
                      <TableRow key={commit.id_commit_recibido}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{mostrarFechaHora(commit.fecha_alta)}</TableCell>
                        <TableCell>
                          <span className="org-celda-principal">{primeraLinea(commit.mensaje)}</span>
                          <span className="org-celda-secundaria">
                            {commit.commit_sha.slice(0, 7)} · {commit.repositorio}
                            {commit.rama ? ` · ${commit.rama}` : ""}
                          </span>
                        </TableCell>
                        <TableCell>
                          {commit.nombre_usuario || commit.autor_nombre || "—"}
                          <span className="org-celda-secundaria">
                            {[commit.nombre_usuario && commit.autor_nombre, commit.autor_email, commit.autor_alias && `máquina: ${commit.autor_alias}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`org-chip org-color--${resultado.color}`}>{resultado.texto}</span>
                          {resultado.falta && <span className="org-celda-secundaria">{resultado.falta}</span>}
                        </TableCell>
                        <TableCell>
                          {commit.nombre_proyecto || "—"}
                          {commit.id_tarea && (
                            <span className="org-celda-secundaria">
                              <Link component="button" type="button" underline="hover" onClick={() => abrirTarea(commit.id_tarea)}>
                                #{commit.id_tarea} {commit.titulo_tarea}
                              </Link>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        }
      </Consulta>
    </main>
  );
};

export default Commits;
