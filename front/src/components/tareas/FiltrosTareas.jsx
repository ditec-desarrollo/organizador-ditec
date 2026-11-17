import { useState } from "react";
import { Button, FormControlLabel, InputAdornment, Switch } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useDatos, useUsuario } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { proyectosApi, usuariosApi } from "../../services/api";
import { aOpciones, FILTROS_TAREA_VACIOS } from "../../utils/opciones";
import { esGestor } from "../../utils/permisos";
import { CampoFecha, CampoSelect, CampoTexto } from "../ui/Campos";

const VENCIMIENTOS = [
  { valor: "vencidas", texto: "Vencidas" },
  { valor: "proximas", texto: "Próximas a vencer" },
];

// Barra de filtros de tareas, compartida por el tablero y la lista.
//   ocultar     -> filtros que no aplican en esa pantalla (ej. ["id_proyecto"] dentro de un proyecto)
//   integrantes -> si se pasa, el filtro de responsable usa esa lista en vez de todos los usuarios
const FiltrosTareas = ({ filtros, onChange, ocultar = [], integrantes }) => {
  const { usuario } = useUsuario();
  const { catalogos } = useDatos();
  const ver = (campo) => !ocultar.includes(campo);

  const proyectos = useConsulta(() => proyectosApi.listar(), [], { activa: ver("id_proyecto") });
  // La lista completa de usuarios solo la pueden pedir administradores y supervisores.
  const pedirUsuarios = ver("id_usuario_responsable") && !integrantes && esGestor(usuario);
  const usuarios = useConsulta(() => usuariosApi.listar({ solo_habilitados: 1 }), [], { activa: pedirUsuarios });

  const responsables = integrantes
    ? aOpciones(integrantes, "id_usuario", "nombre_usuario")
    : (usuarios.datos ?? []).map((u) => ({ valor: u.id_usuario, texto: `${u.nombre_persona} ${u.apellido_persona}` }));
  const verResponsable = ver("id_usuario_responsable") && (Boolean(integrantes) || pedirUsuarios);

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
      {verResponsable && (
        <CampoSelect
          etiqueta="Responsable"
          valor={filtros.id_usuario_responsable}
          onChange={cambiar("id_usuario_responsable")}
          opciones={responsables}
          vacio="Todos"
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
      <CampoSelect
        etiqueta="Prioridad"
        valor={filtros.id_prioridad}
        onChange={cambiar("id_prioridad")}
        opciones={aOpciones(catalogos.prioridades, "id_prioridad", "nombre_prioridad")}
        vacio="Todas"
      />
      <CampoSelect etiqueta="Vencimiento" valor={filtros.vencimiento} onChange={cambiar("vencimiento")} opciones={VENCIMIENTOS} vacio="Cualquiera" />
      <CampoFecha etiqueta="Vence desde" valor={filtros.vence_desde} onChange={cambiar("vence_desde")} />
      <CampoFecha etiqueta="Vence hasta" valor={filtros.vence_hasta} onChange={cambiar("vence_hasta")} />
      <FormControlLabel
        className="org-filtros__fijo"
        control={<Switch checked={filtros.mias === 1} onChange={(evento) => cambiar("mias")(evento.target.checked ? 1 : "")} />}
        label="Solo mis tareas"
      />
      {hayFiltros && (
        <Button className="org-filtros__fijo" onClick={() => onChange({ ...filtros, ...FILTROS_TAREA_VACIOS })}>
          Limpiar
        </Button>
      )}
    </div>
  );
};

export default FiltrosTareas;
