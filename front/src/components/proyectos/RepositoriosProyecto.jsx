import { useState } from "react";
import { Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from "@mui/material";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import { confirmarBorrado } from "../../common/alerta";
import { useDatos } from "../../context/contextos";
import { proyectosApi } from "../../services/api";
import { avisarError, avisarExito, erroresDeCampo } from "../../utils/avisos";
import { mostrarFecha } from "../../utils/fechas";
import { CampoTexto } from "../ui/Campos";
import { EstadoVacio } from "../ui/Estados";

// Repositorios de git del proyecto. Cada commit que Claude Code hace en uno de ellos se registra solo
// como tarea de este proyecto. Quien gestiona el proyecto puede vincular y desvincular.
const RepositoriosProyecto = ({ proyecto }) => {
  const { refrescar } = useDatos();
  const puedeGestionar = proyecto.puede_gestionar && proyecto.archivado !== 1;
  const [repositorio, setRepositorio] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const vincular = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await proyectosApi.vincularRepositorio(proyecto.id_proyecto, repositorio.trim());
      avisarExito("Repositorio vinculado");
      setRepositorio("");
      refrescar();
    } catch (fallo) {
      const deCampo = erroresDeCampo(fallo).repositorio;
      if (deCampo) setError(deCampo);
      else avisarError(fallo);
    } finally {
      setGuardando(false);
    }
  };

  const desvincular = async (vinculo) => {
    const { isConfirmed } = await confirmarBorrado({
      title: "¿Desvincular el repositorio?",
      text: `Los commits de ${vinculo.repositorio} van a dejar de generar tareas en este proyecto. Las que ya se crearon no se tocan.`,
      confirmButtonText: "Desvincular",
    });
    if (!isConfirmed) return;
    try {
      await proyectosApi.desvincularRepositorio(proyecto.id_proyecto, vinculo.id_proyecto_repositorio);
      avisarExito("Repositorio desvinculado");
      refrescar();
    } catch (fallo) {
      avisarError(fallo);
    }
  };

  return (
    <>
      <p className="org-celda-secundaria" style={{ fontSize: "0.875rem", margin: "0 0 12px" }}>
        Cada commit que Claude Code hace en estos repositorios se registra solo como una tarea finalizada de este proyecto, a nombre de
        quien lo hizo. Si el mensaje del commit dice <strong>tarea #12</strong>, en vez de crear una tarea se anota como novedad en la
        tarea 12.
      </p>

      {puedeGestionar && (
        <form className="cd-superficie org-filtros" onSubmit={vincular} noValidate>
          <CampoTexto
            etiqueta="Vincular repositorio"
            placeholder="https://github.com/ditec-desarrollo/mi-repo"
            valor={repositorio}
            onChange={setRepositorio}
            error={error}
            ayuda="La dirección del repositorio en GitHub. Si no tiene remoto, el nombre de su carpeta."
            inputProps={{ maxLength: 500 }}
          />
          <Button
            className="org-filtros__fijo"
            type="submit"
            variant="contained"
            startIcon={<AddLinkRoundedIcon />}
            disabled={!repositorio.trim() || guardando}
          >
            Vincular
          </Button>
        </form>
      )}

      {proyecto.repositorios.length === 0 ? (
        <div className="cd-superficie">
          <EstadoVacio
            titulo="El proyecto no tiene repositorios vinculados"
            texto="Mientras no tenga ninguno, los commits no generan tareas acá."
          />
        </div>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Repositorio</TableCell>
                <TableCell>Vinculado</TableCell>
                {puedeGestionar && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {proyecto.repositorios.map((vinculo) => (
                <TableRow key={vinculo.id_proyecto_repositorio}>
                  <TableCell>
                    <span className="org-celda-principal">{vinculo.repositorio}</span>
                  </TableCell>
                  <TableCell>{mostrarFecha(vinculo.fecha_alta)}</TableCell>
                  {puedeGestionar && (
                    <TableCell align="right">
                      <Tooltip title="Desvincular">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => desvincular(vinculo)}
                          aria-label={`Desvincular ${vinculo.repositorio}`}
                        >
                          <LinkOffRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default RepositoriosProyecto;
