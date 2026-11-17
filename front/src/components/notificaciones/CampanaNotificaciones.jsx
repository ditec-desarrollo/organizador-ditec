import { useState } from "react";
import { Badge, Button, IconButton, Menu } from "@mui/material";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { useDatos } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { useNotificaciones } from "../../hooks/useNotificaciones";
import { notificacionesApi } from "../../services/api";
import { Consulta, EstadoVacio } from "../ui/Estados";
import ListaNotificaciones from "./ListaNotificaciones";

// Campana del header: muestra cuántas notificaciones hay sin leer y, al abrirla, las últimas.
const CampanaNotificaciones = ({ onVerTodas }) => {
  const { noLeidas } = useDatos();
  const [ancla, setAncla] = useState(null);
  const abierta = Boolean(ancla);
  // Solo se piden cuando se abre el menú.
  const consulta = useConsulta(() => notificacionesApi.listar({ cantidad: 8 }), [abierta], { activa: abierta });
  const { elegir, marcarTodas } = useNotificaciones();

  const cerrar = () => setAncla(null);

  return (
    <>
      <IconButton
        className="cd-nav__tema"
        size="small"
        onClick={(evento) => setAncla(evento.currentTarget)}
        aria-label={noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : "Notificaciones"}
        title="Notificaciones"
      >
        <Badge badgeContent={noLeidas} color="error" max={99}>
          <NotificationsNoneRoundedIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Menu
        className="cd-shell cd-menu"
        anchorEl={ancla}
        open={abierta}
        onClose={cerrar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <div className="org-notificaciones">
          <div className="org-notificaciones__cabecera">
            <span>Notificaciones</span>
            {noLeidas > 0 && (
              <Button size="small" onClick={marcarTodas}>
                Marcar todas como leídas
              </Button>
            )}
          </div>
          <div className="org-notificaciones__lista">
            <Consulta consulta={consulta}>
              {(notificaciones) =>
                notificaciones.length === 0 ? (
                  <EstadoVacio titulo="No tenés notificaciones" />
                ) : (
                  <ListaNotificaciones
                    notificaciones={notificaciones}
                    onElegir={(notificacion) => {
                      cerrar();
                      elegir(notificacion);
                    }}
                  />
                )
              }
            </Consulta>
          </div>
          <Button
            fullWidth
            size="small"
            onClick={() => {
              cerrar();
              onVerTodas();
            }}
            sx={{ mt: 0.5 }}
          >
            Ver todas
          </Button>
        </div>
      </Menu>
    </>
  );
};

export default CampanaNotificaciones;
