import { useSearchParams } from "react-router-dom";
import EncabezadoPagina from "../common/EncabezadoPagina";
import TablaEsqueleto from "../components/Esqueletos/TablaEsqueleto";
import FiltrosTareas from "../components/tareas/FiltrosTareas";
import TablaTareas from "../components/tareas/TablaTareas";
import { Consulta } from "../components/ui/Estados";
import { useDatos } from "../context/contextos";
import { useFiltrosTareas } from "../hooks/useFiltrosTareas";
import { useTareas } from "../hooks/useTareas";

// Lo que este historial siempre pide: solo tareas finalizadas, de la más reciente a la más vieja.
const FIJOS = { solo_finalizadas: 1, ordenar: "finalizacion" };

// Historial: todas las tareas finalizadas, incluidas las que el tablero ya no muestra.
// Se busca por proyecto, persona o mes. Desde la columna "Finalizada" del tablero de un proyecto
// se llega con ?id_proyecto=<id> ya elegido.
const Historial = () => {
  const { catalogos } = useDatos();
  const [parametros] = useSearchParams();
  const { filtros, setFiltros, paraApi } = useFiltrosTareas(FIJOS, { id_proyecto: Number(parametros.get("id_proyecto")) || "" });
  const consulta = useTareas(paraApi);
  const dias = catalogos.configuracion.dias_finalizadas_en_tablero;

  return (
    <main className="org-pagina">
      <EncabezadoPagina
        sup="Tareas"
        titulo="Historial"
        subtitulo={`Todas las tareas finalizadas. El tablero muestra solo las de los últimos ${dias} días; acá están también las anteriores.`}
      />
      <FiltrosTareas filtros={filtros} onChange={setFiltros} ocultar={["id_etarea", "id_prioridad", "vencimiento"]} conMes />
      <Consulta consulta={consulta} esqueleto={<TablaEsqueleto />}>
        {(tareas) => <TablaTareas tareas={tareas} fecha="finalizacion" vacio="No hay tareas finalizadas con esos filtros." />}
      </Consulta>
    </main>
  );
};

export default Historial;
