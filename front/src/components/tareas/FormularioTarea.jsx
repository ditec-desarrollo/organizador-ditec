import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useDatos } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { proyectosApi, tareasApi } from "../../services/api";
import { avisarExito, mostrarErrorDeFormulario } from "../../utils/avisos";
import { aOpciones, oNull } from "../../utils/opciones";
import { CampoFecha, CampoSeleccionMultiple, CampoSelect, CampoTexto } from "../ui/Campos";

const PRIORIDAD_MEDIA = 2;
const ESTADO_PENDIENTE = 1;

// Mismas reglas que valida el back (validations/tareasValidation.js), para avisar antes de enviar.
const validar = (datos) => {
  const errores = {};
  if (!datos.id_proyecto) errores.id_proyecto = "Elegí un proyecto";
  if (datos.titulo.trim().length < 3) errores.titulo = "Tiene que tener al menos 3 caracteres";
  if (!datos.id_prioridad) errores.id_prioridad = "Elegí una prioridad";
  if (datos.fecha_inicio && datos.fecha_vencimiento && datos.fecha_vencimiento < datos.fecha_inicio) {
    errores.fecha_vencimiento = "No puede ser anterior a la fecha de inicio";
  }
  return errores;
};

// Alta (sin `tarea`) o edición de los datos generales de una tarea.
// `idProyecto` fija el proyecto cuando se crea desde el detalle de un proyecto.
const FormularioTarea = ({ tarea, idProyecto, onCerrar, onGuardada }) => {
  const esEdicion = Boolean(tarea);
  const { catalogos } = useDatos();
  const [datos, setDatos] = useState({
    id_proyecto: tarea?.id_proyecto ?? idProyecto ?? "",
    titulo: tarea?.titulo ?? "",
    descripcion: tarea?.descripcion ?? "",
    ids_responsables: tarea ? tarea.responsables.map((responsable) => responsable.id_usuario) : [],
    id_prioridad: tarea?.id_prioridad ?? PRIORIDAD_MEDIA,
    id_etarea: tarea?.id_etarea ?? ESTADO_PENDIENTE,
    fecha_inicio: tarea?.fecha_inicio ?? "",
    fecha_vencimiento: tarea?.fecha_vencimiento ?? "",
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const proyectoFijo = esEdicion || Boolean(idProyecto);
  const proyectos = useConsulta(() => proyectosApi.listar(), [], { activa: !proyectoFijo });
  // Los responsables tienen que ser integrantes del proyecto elegido.
  const integrantes = useConsulta(() => proyectosApi.integrantes(datos.id_proyecto), [datos.id_proyecto], {
    activa: Boolean(datos.id_proyecto),
  });

  const cambiar = (campo) => (valor) => setDatos((actuales) => ({ ...actuales, [campo]: valor }));
  const cambiarProyecto = (valor) => setDatos((actuales) => ({ ...actuales, id_proyecto: valor, ids_responsables: [] }));

  const guardar = async (evento) => {
    evento.preventDefault();
    const erroresLocales = validar(datos);
    setErrores(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return;

    const generales = {
      titulo: datos.titulo.trim(),
      descripcion: oNull(datos.descripcion.trim()),
      ids_responsables: datos.ids_responsables,
      id_prioridad: datos.id_prioridad,
      fecha_inicio: oNull(datos.fecha_inicio),
      fecha_vencimiento: oNull(datos.fecha_vencimiento),
    };

    setGuardando(true);
    try {
      const guardada = esEdicion
        ? await tareasApi.actualizar(tarea.id_tarea, generales)
        : await tareasApi.crear({ ...generales, id_proyecto: datos.id_proyecto, id_etarea: datos.id_etarea });
      avisarExito(esEdicion ? "Tarea actualizada" : "Tarea creada");
      onGuardada(guardada);
    } catch (error) {
      mostrarErrorDeFormulario(error, setErrores);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open onClose={guardando ? undefined : onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={guardar} noValidate>
        <DialogTitle>{esEdicion ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
        <DialogContent>
          <div className="row g-3 pt-2">
            {!proyectoFijo && (
              <div className="col-12">
                <CampoSelect
                  etiqueta="Proyecto"
                  valor={datos.id_proyecto}
                  onChange={cambiarProyecto}
                  opciones={aOpciones(proyectos.datos, "id_proyecto", "nombre_proyecto")}
                  error={errores.id_proyecto}
                  required
                />
              </div>
            )}
            <div className="col-12">
              <CampoTexto
                etiqueta="Título"
                valor={datos.titulo}
                onChange={cambiar("titulo")}
                error={errores.titulo}
                inputProps={{ maxLength: 200 }}
                required
                autoFocus
              />
            </div>
            <div className="col-12">
              <CampoTexto
                etiqueta="Descripción"
                valor={datos.descripcion}
                onChange={cambiar("descripcion")}
                error={errores.descripcion}
                multiline
                minRows={3}
                maxRows={10}
                inputProps={{ maxLength: 5000 }}
              />
            </div>
            <div className="col-12 col-sm-6">
              <CampoSeleccionMultiple
                etiqueta="Responsables"
                valor={datos.ids_responsables}
                onChange={cambiar("ids_responsables")}
                opciones={aOpciones(integrantes.datos, "id_usuario", "nombre_usuario")}
                vacio="Sin asignar"
                error={errores.ids_responsables}
                ayuda={datos.id_proyecto ? "Podés elegir más de uno" : "Elegí primero el proyecto"}
                disabled={!datos.id_proyecto}
              />
            </div>
            <div className="col-12 col-sm-6">
              <CampoSelect
                etiqueta="Prioridad"
                valor={datos.id_prioridad}
                onChange={cambiar("id_prioridad")}
                opciones={aOpciones(catalogos.prioridades, "id_prioridad", "nombre_prioridad")}
                error={errores.id_prioridad}
                required
              />
            </div>
            {!esEdicion && (
              <div className="col-12 col-sm-6">
                <CampoSelect
                  etiqueta="Estado inicial"
                  valor={datos.id_etarea}
                  onChange={cambiar("id_etarea")}
                  opciones={aOpciones(catalogos.estadosTarea, "id_etarea", "nombre_etarea")}
                  error={errores.id_etarea}
                />
              </div>
            )}
            <div className="col-12 col-sm-6">
              <CampoFecha etiqueta="Fecha de inicio" valor={datos.fecha_inicio} onChange={cambiar("fecha_inicio")} error={errores.fecha_inicio} />
            </div>
            <div className="col-12 col-sm-6">
              <CampoFecha
                etiqueta="Fecha de vencimiento"
                valor={datos.fecha_vencimiento}
                onChange={cambiar("fecha_vencimiento")}
                error={errores.fecha_vencimiento}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={guardando}>
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FormularioTarea;
