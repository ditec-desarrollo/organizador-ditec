import { useState } from "react";
import { Button, FormControlLabel, Switch } from "@mui/material";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import EncabezadoPagina from "../common/EncabezadoPagina";
import ListaNotificaciones from "../components/notificaciones/ListaNotificaciones";
import { Consulta, EstadoVacio } from "../components/ui/Estados";
import { useDatos } from "../context/contextos";
import { useConsulta } from "../hooks/useConsulta";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { notificacionesApi } from "../services/api";

const Notificaciones = () => {
  const { noLeidas } = useDatos();
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const consulta = useConsulta(
    () => notificacionesApi.listar({ solo_no_leidas: soloNoLeidas ? 1 : "", cantidad: 200 }),
    [soloNoLeidas],
  );
  const { elegir, marcarTodas } = useNotificaciones();

  return (
    <main className="org-pagina">
      <EncabezadoPagina
        sup="Notificaciones"
        titulo="Notificaciones"
        subtitulo={noLeidas > 0 ? `Tenés ${noLeidas} sin leer.` : "Estás al día."}
        acciones={
          <>
            <FormControlLabel
              control={<Switch checked={soloNoLeidas} onChange={(evento) => setSoloNoLeidas(evento.target.checked)} />}
              label="Solo sin leer"
            />
            <Button variant="outlined" startIcon={<DoneAllRoundedIcon />} onClick={marcarTodas} disabled={noLeidas === 0}>
              Marcar todas como leídas
            </Button>
          </>
        }
      />

      <div className="cd-superficie org-bloque">
        <Consulta consulta={consulta}>
          {(notificaciones) =>
            notificaciones.length === 0 ? (
              <EstadoVacio
                titulo={soloNoLeidas ? "No tenés notificaciones sin leer" : "No tenés notificaciones"}
                texto="Te vamos a avisar cuando te asignen una tarea, la modifiquen, la comenten o esté por vencer."
              />
            ) : (
              <ListaNotificaciones notificaciones={notificaciones} onElegir={elegir} />
            )
          }
        </Consulta>
      </div>
    </main>
  );
};

export default Notificaciones;
