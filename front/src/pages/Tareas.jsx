import { useState } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import EncabezadoPagina from "../common/EncabezadoPagina";
import TablaEsqueleto from "../components/Esqueletos/TablaEsqueleto";
import BotonNuevaTarea from "../components/tareas/BotonNuevaTarea";
import FiltrosTareas from "../components/tareas/FiltrosTareas";
import TablaTareas from "../components/tareas/TablaTareas";
import { Consulta } from "../components/ui/Estados";
import { useFiltrosTareas } from "../hooks/useFiltrosTareas";
import { useTareas } from "../hooks/useTareas";

// Lista de tareas con búsqueda y filtros. Las archivadas se consultan con el interruptor.
const Tareas = () => {
  const [archivadas, setArchivadas] = useState(false);
  const { filtros, setFiltros, paraApi } = useFiltrosTareas({ ordenar: "vencimiento", archivada: archivadas ? 1 : 0 });
  const consulta = useTareas(paraApi);

  return (
    <main className="org-pagina">
      <EncabezadoPagina
        sup="Tareas"
        titulo="Lista de tareas"
        subtitulo="Buscá y filtrá las tareas de tus proyectos. Están ordenadas por fecha de vencimiento."
        acciones={
          <>
            <FormControlLabel
              control={<Switch checked={archivadas} onChange={(evento) => setArchivadas(evento.target.checked)} />}
              label="Ver archivadas"
            />
            <BotonNuevaTarea />
          </>
        }
      />
      <FiltrosTareas filtros={filtros} onChange={setFiltros} />
      <Consulta consulta={consulta} esqueleto={<TablaEsqueleto />}>
        {(tareas) => <TablaTareas tareas={tareas} />}
      </Consulta>
    </main>
  );
};

export default Tareas;
