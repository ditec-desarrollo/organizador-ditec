import { useState } from "react";
import { Button, IconButton, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import { confirmarBorrado } from "../../common/alerta";
import { useDatos } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { proyectosApi, usuariosApi } from "../../services/api";
import { avisarError, avisarExito } from "../../utils/avisos";
import { CampoSelect } from "../ui/Campos";
import { ChipNeutro } from "../ui/Chips";
import { EstadoVacio } from "../ui/Estados";

// Integrantes de un proyecto. Quien gestiona el proyecto puede sumar, quitar y marcar responsables.
// Puede haber varios responsables; es un dato informativo, no cambia lo que cada uno puede hacer.
const IntegrantesProyecto = ({ proyecto }) => {
  const { refrescar } = useDatos();
  const puedeGestionar = proyecto.puede_gestionar && proyecto.archivado !== 1;
  const [elegido, setElegido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const usuarios = useConsulta(() => usuariosApi.listar({ solo_habilitados: 1 }), [], { activa: puedeGestionar });

  const idsIntegrantes = new Set(proyecto.integrantes.map((i) => i.id_usuario));
  const disponibles = (usuarios.datos ?? [])
    .filter((u) => !idsIntegrantes.has(u.id_usuario))
    .map((u) => ({ valor: u.id_usuario, texto: `${u.nombre_persona} ${u.apellido_persona} · ${u.nombre_tusuario}` }));

  const agregar = async () => {
    setGuardando(true);
    try {
      await proyectosApi.agregarIntegrante(proyecto.id_proyecto, elegido);
      avisarExito("Integrante agregado");
      setElegido("");
      refrescar();
    } catch (error) {
      avisarError(error);
    } finally {
      setGuardando(false);
    }
  };

  const marcarResponsable = async (integrante, es_responsable) => {
    try {
      await proyectosApi.marcarResponsable(proyecto.id_proyecto, integrante.id_usuario, es_responsable);
      refrescar();
    } catch (error) {
      avisarError(error);
    }
  };

  const quitar = async (integrante) => {
    const { isConfirmed } = await confirmarBorrado({
      title: "¿Quitar del proyecto?",
      text: `${integrante.nombre_usuario} va a dejar de ver este proyecto y sus tareas.`,
      confirmButtonText: "Quitar",
    });
    if (!isConfirmed) return;
    try {
      await proyectosApi.quitarIntegrante(proyecto.id_proyecto, integrante.id_usuario);
      avisarExito("Integrante quitado");
      refrescar();
    } catch (error) {
      avisarError(error);
    }
  };

  return (
    <>
      {puedeGestionar && (
        <div className="cd-superficie org-filtros">
          <CampoSelect
            etiqueta="Sumar integrante"
            valor={elegido}
            onChange={setElegido}
            opciones={disponibles}
            helperText={usuarios.datos && disponibles.length === 0 ? "Todos los usuarios ya son integrantes" : undefined}
            disabled={disponibles.length === 0}
          />
          <Button
            className="org-filtros__fijo"
            variant="contained"
            startIcon={<PersonAddAltRoundedIcon />}
            onClick={agregar}
            disabled={!elegido || guardando}
          >
            Agregar
          </Button>
        </div>
      )}

      {proyecto.integrantes.length === 0 ? (
        <div className="cd-superficie">
          <EstadoVacio titulo="El proyecto no tiene integrantes" />
        </div>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell align="right">Tareas abiertas</TableCell>
                {puedeGestionar && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {proyecto.integrantes.map((integrante) => (
                <TableRow key={integrante.id_usuario}>
                  <TableCell>
                    <span className="org-celda-principal">{integrante.nombre_usuario}</span>
                    {integrante.email_persona && <span className="org-celda-secundaria">{integrante.email_persona}</span>}
                  </TableCell>
                  <TableCell>
                    <ChipNeutro>{integrante.nombre_tusuario}</ChipNeutro>
                  </TableCell>
                  <TableCell>
                    {puedeGestionar ? (
                      <Switch
                        size="small"
                        checked={integrante.es_responsable === 1}
                        onChange={(evento) => marcarResponsable(integrante, evento.target.checked ? 1 : 0)}
                        inputProps={{ "aria-label": `${integrante.nombre_usuario} es responsable del proyecto` }}
                      />
                    ) : integrante.es_responsable === 1 ? (
                      <span className="org-chip org-color--azul">Responsable</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell align="right">{integrante.tareas_abiertas}</TableCell>
                  {puedeGestionar && (
                    <TableCell align="right">
                      <Tooltip title="Quitar del proyecto">
                        <IconButton size="small" color="error" onClick={() => quitar(integrante)} aria-label={`Quitar a ${integrante.nombre_usuario}`}>
                          <PersonRemoveOutlinedIcon fontSize="small" />
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

export default IntegrantesProyecto;
