import { useState } from "react";
import { Button, FormControlLabel, InputAdornment, Skeleton, Switch } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useNavigate } from "react-router-dom";
import EncabezadoPagina from "../common/EncabezadoPagina";
import FormularioProyecto from "../components/proyectos/FormularioProyecto";
import TarjetaProyecto from "../components/proyectos/TarjetaProyecto";
import { CampoSelect, CampoTexto } from "../components/ui/Campos";
import { Consulta, EstadoVacio } from "../components/ui/Estados";
import { useDatos, useUsuario } from "../context/contextos";
import { useConsulta } from "../hooks/useConsulta";
import { useValorDemorado } from "../hooks/useValorDemorado";
import { proyectosApi } from "../services/api";
import { aOpciones } from "../utils/opciones";
import { esGestor } from "../utils/permisos";

const GrillaEsqueleto = () => (
  <div className="org-proyectos" aria-busy="true">
    {[1, 2, 3].map((n) => (
      <Skeleton key={n} variant="rounded" animation="wave" height={190} />
    ))}
  </div>
);

const Proyectos = () => {
  const { usuario } = useUsuario();
  const { catalogos } = useDatos();
  const navigate = useNavigate();
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("");
  const [archivados, setArchivados] = useState(false);
  const [creando, setCreando] = useState(false);
  const buscarDemorado = useValorDemorado(buscar.trim());

  const consulta = useConsulta(
    () => proyectosApi.listar({ buscar: buscarDemorado, id_eproyecto: estado, archivado: archivados ? 1 : 0 }),
    [buscarDemorado, estado, archivados],
  );
  const puedeCrear = esGestor(usuario);
  const hayFiltros = buscar !== "" || estado !== "" || archivados;
  const abrir = (id_proyecto) => navigate(`/proyectos/${id_proyecto}`);

  return (
    <main className="org-pagina">
      <EncabezadoPagina
        sup="Proyectos"
        titulo="Proyectos"
        subtitulo={puedeCrear ? "Los proyectos que gestionás y su avance." : "Los proyectos en los que participás."}
        acciones={
          puedeCrear && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreando(true)}>
              Nuevo proyecto
            </Button>
          )
        }
      />

      <div className="cd-superficie org-filtros" role="search">
        <CampoTexto
          className="org-filtros__buscar"
          etiqueta="Buscar"
          placeholder="Nombre del proyecto"
          valor={buscar}
          onChange={setBuscar}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <CampoSelect
          etiqueta="Estado"
          valor={estado}
          onChange={setEstado}
          opciones={aOpciones(catalogos.estadosProyecto, "id_eproyecto", "nombre_eproyecto")}
          vacio="Todos"
        />
        <FormControlLabel
          className="org-filtros__fijo"
          control={<Switch checked={archivados} onChange={(evento) => setArchivados(evento.target.checked)} />}
          label="Ver archivados"
        />
      </div>

      <Consulta consulta={consulta} esqueleto={<GrillaEsqueleto />}>
        {(proyectos) =>
          proyectos.length === 0 ? (
            <div className="cd-superficie">
              <EstadoVacio
                titulo={hayFiltros ? "Ningún proyecto coincide con los filtros" : "Todavía no hay proyectos"}
                texto={
                  hayFiltros
                    ? "Probá con otra búsqueda u otro estado."
                    : puedeCrear
                      ? "Creá el primero para empezar a organizar las tareas del equipo."
                      : "Cuando te sumen a un proyecto, va a aparecer acá."
                }
              />
            </div>
          ) : (
            <div className="org-proyectos">
              {proyectos.map((proyecto) => (
                <TarjetaProyecto key={proyecto.id_proyecto} proyecto={proyecto} onAbrir={abrir} />
              ))}
            </div>
          )
        }
      </Consulta>

      {creando && (
        <FormularioProyecto
          onCerrar={() => setCreando(false)}
          onGuardado={(proyecto) => {
            setCreando(false);
            abrir(proyecto.id_proyecto);
          }}
        />
      )}
    </main>
  );
};

export default Proyectos;
