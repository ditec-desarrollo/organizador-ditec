import { Skeleton } from "@mui/material";
import EncabezadoPagina from "../common/EncabezadoPagina";
import Tablero from "../components/tablero/Tablero";
import BotonNuevaTarea from "../components/tareas/BotonNuevaTarea";
import FiltrosTareas from "../components/tareas/FiltrosTareas";
import { Consulta } from "../components/ui/Estados";
import { useFiltrosTareas } from "../hooks/useFiltrosTareas";
import { useTareas } from "../hooks/useTareas";

// tablero: 1 -> el back no trae las finalizadas hace más de unos días (quedan en el Historial).
const FIJOS = { tablero: 1 };

// Tablero Kanban con las tareas de todos los proyectos que el usuario puede ver.
const TableroGeneral = () => {
  const { filtros, setFiltros, paraApi } = useFiltrosTareas(FIJOS);
  const consulta = useTareas(paraApi);

  return (
    <main className="org-pagina org-pagina--ancha">
      <EncabezadoPagina
        sup="Tareas"
        titulo="Tablero"
        subtitulo="Arrastrá una tarjeta a otra columna para cambiar su estado."
        acciones={<BotonNuevaTarea />}
      />
      {/* El estado no se filtra acá: cada estado es una columna. */}
      <FiltrosTareas filtros={filtros} onChange={setFiltros} ocultar={["id_etarea"]} />
      <Consulta consulta={consulta} esqueleto={<Skeleton variant="rounded" animation="wave" height={360} />}>
        {(tareas) => <Tablero tareas={tareas} onMover={consulta.mover} />}
      </Consulta>
    </main>
  );
};

export default TableroGeneral;
