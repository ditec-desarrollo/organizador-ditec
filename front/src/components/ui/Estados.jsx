import { Button, Skeleton } from "@mui/material";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { mensajeDeError } from "../../utils/avisos";

// Lo que se muestra cuando una lista no tiene nada.
export const EstadoVacio = ({ titulo = "No hay nada para mostrar", texto, accion, icono }) => (
  <div className="org-vacio">
    {icono ?? <InboxRoundedIcon />}
    <p className="org-vacio__titulo">{titulo}</p>
    {texto && <p className="org-vacio__texto">{texto}</p>}
    {accion}
  </div>
);

// Lo que se muestra cuando un pedido a la API falló, con opción de reintentar.
export const EstadoError = ({ error, onReintentar }) => (
  <div className="org-vacio" role="alert">
    <ErrorOutlineRoundedIcon />
    <p className="org-vacio__titulo">No se pudieron cargar los datos</p>
    <p className="org-vacio__texto">{mensajeDeError(error)}</p>
    {onReintentar && (
      <Button variant="outlined" size="small" onClick={onReintentar} sx={{ mt: 1 }}>
        Reintentar
      </Button>
    )}
  </div>
);

// Skeleton con la forma de una lista (la guía pide skeletons en vez de spinners).
export const ListaEsqueleto = ({ filas = 4, alto = 44 }) => (
  <div aria-busy="true" aria-label="Cargando">
    {Array.from({ length: filas }, (_, i) => (
      <Skeleton key={i} variant="rounded" animation="wave" height={alto} sx={{ mb: 1 }} />
    ))}
  </div>
);

// Resuelve los tres estados de una consulta (useConsulta): carga, error y datos.
//   <Consulta consulta={consulta} esqueleto={<TablaEsqueleto />}>{(datos) => …}</Consulta>
export const Consulta = ({ consulta, esqueleto, children }) => {
  if (consulta.error && !consulta.datos) return <EstadoError error={consulta.error} onReintentar={consulta.recargar} />;
  if (!consulta.datos) return esqueleto ?? <ListaEsqueleto />;
  return children(consulta.datos);
};
