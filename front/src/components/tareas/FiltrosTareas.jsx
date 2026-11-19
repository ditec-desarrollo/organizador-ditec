import { useState } from "react";
import { Button, FormControlLabel, InputAdornment, Switch } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useDatos } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { proyectosApi, usuariosApi } from "../../services/api";
import { aOpciones, FILTROS_TAREA_VACIOS } from "../../utils/opciones";
import { CampoFecha, CampoSelect, CampoTexto } from "../ui/Campos";

const VENCIMIENTOS = [
  { valor: "vencidas", texto: "Vencidas" },
  { valor: "proximas", texto: "Próximas a vencer" },
];

// Barra de filtros de tareas, compartida por el tablero, la lista y el historial.
//   ocultar     -> filtros que no aplican en esa pantalla. Valores: "id_proyecto", "id_usuario_responsable",
//                  "id_etarea", "id_prioridad", "vencimiento" (incluye el rango de fechas) y "mias"
//   integrantes -> si se pasa, el filtro de responsable usa esa lista en vez de todos los usuarios
//   conMes      -> agrega el filtro por mes de finalización (historial)
const FiltrosTareas = ({ filtros, onChange, ocultar = [], integrantes, conMes = false }) => {
  const { catalogos } = useDatos();
  const ver = (campo) => !ocultar.includes(campo);

  const proyectos = useConsulta(() => proyectosApi.listar(), [], { activa: ver("id_proyecto") });
  // Lista mínima de usuarios (id y nombre): la puede pedir cualquiera, así todos pueden filtrar por persona.
  // El back igual devuelve solo las tareas de los proyectos que cada uno puede ver.
  const usuarios = useConsulta(() => usuariosApi.etiquetables(), [], { activa: ver("id_usuario_responsable") && !integrantes });
  const responsables = aOpciones(integrantes ?? usuarios.datos, "id_usuario", "nombre_usuario");

  const [abiertos, setAbiertos] = useState(false);
  const cambiar = (campo) => (valor) => onChange({ ...filtros, [campo]: valor });
  const hayFiltros = Object.keys(FILTROS_TAREA_VACIOS).some((campo) => filtros[campo] !== "");

  return (
    <div className={`cd-superficie org-filtros org-filtros--plegable ocultarAlImprimir${abiertos ? " org-filtros--abiertos" : ""}`} role="search">
      <CampoTexto
        className="org-filtros__buscar org-filtros__siempre"
        etiqueta="Buscar"
        placeholder="Nombre de la tarea o del proyecto"
        valor={filtros.buscar}
        onChange={cambiar("buscar")}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Button
        className="org-filtros__alternar org-filtros__siempre"
        variant="outlined"
        startIcon={<TuneRoundedIcon />}
        onClick={() => setAbiertos((valor) => !valor)}
        aria-expanded={abiertos}
      >
        {abiertos ? "Ocultar filtros" : hayFiltros ? "Filtros (hay activos)" : "Filtros"}
      </Button>
      {ver("id_proyecto") && (
        <CampoSelect
          etiqueta="Proyecto"
          valor={filtros.id_proyecto}
          onChange={cambiar("id_proyecto")}
          opciones={aOpciones(proyectos.datos, "id_proyecto", "nombre_proyecto")}
          vacio="Todos"
        />
      )}
      {ver("id_usuario_responsable") && (
        <CampoSelect
          etiqueta="Responsable"
          valor={filtros.id_usuario_responsable}
          onChange={cambiar("id_usuario_responsable")}
          opciones={responsables}
          vacio="Todos"
        />
      )}
      {conMes && (
        <CampoTexto
          etiqueta="Mes de finalización"
          type="month"
          valor={filtros.mes}
          onChange={cambiar("mes")}
          InputLabelProps={{ shrink: true }}
        />
      )}
      {ver("id_etarea") && (
        <CampoSelect
          etiqueta="Estado"
          valor={filtros.id_etarea}
          onChange={cambiar("id_etarea")}
          opciones={aOpciones(catalogos.estadosTarea, "id_etarea", "nombre_etarea")}
          vacio="Todos"
        />
      )}
      {ver("id_prioridad") && (
        <CampoSelect
          etiqueta="Prioridad"
          valor={filtros.id_prioridad}
          onChange={cambiar("id_prioridad")}
          opciones={aOpciones(catalogos.prioridades, "id_prioridad", "nombre_prioridad")}
          vacio="Todas"
        />
      )}
      {ver("vencimiento") && (
        <>
          <CampoSelect etiqueta="Vencimiento" valor={filtros.vencimiento} onChange={cambiar("vencimiento")} opciones={VENCIMIENTOS} vacio="Cualquiera" />
          <CampoFecha etiqueta="Vence desde" valor={filtros.vence_desde} onChange={cambiar("vence_desde")} />
          <CampoFecha etiqueta="Vence hasta" valor={filtros.vence_hasta} onChange={cambiar("vence_hasta")} />
        </>
      )}
      {ver("mias") && (
        <FormControlLabel
          className="org-filtros__fijo"
          control={<Switch checked={filtros.mias === 1} onChange={(evento) => cambiar("mias")(evento.target.checked ? 1 : "")} />}
          label="Solo mis tareas"
        />
      )}
      {hayFiltros && (
        <Button className="org-filtros__fijo" onClick={() => onChange({ ...filtros, ...FILTROS_TAREA_VACIOS })}>
          Limpiar
        </Button>
      )}
    </div>
  );
};

export default FiltrosTareas;
