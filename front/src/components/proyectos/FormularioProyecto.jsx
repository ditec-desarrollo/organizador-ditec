import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useDatos } from "../../context/contextos";
import { proyectosApi } from "../../services/api";
import { avisarExito, mostrarErrorDeFormulario } from "../../utils/avisos";
import { aOpciones, oNull } from "../../utils/opciones";
import { CampoFecha, CampoSelect, CampoTexto } from "../ui/Campos";

const ESTADO_PLANIFICACION = 1;

// Mismas reglas que valida el back (validations/proyectosValidation.js).
const validar = (datos) => {
  const errores = {};
  if (datos.nombre_proyecto.trim().length < 3) errores.nombre_proyecto = "Tiene que tener al menos 3 caracteres";
  if (!datos.id_eproyecto) errores.id_eproyecto = "Elegí un estado";
  if (datos.fecha_inicio && datos.fecha_fin_estimada && datos.fecha_fin_estimada < datos.fecha_inicio) {
    errores.fecha_fin_estimada = "No puede ser anterior a la fecha de inicio";
  }
  return errores;
};

// Alta (sin `proyecto`) o edición de un proyecto.
const FormularioProyecto = ({ proyecto, onCerrar, onGuardado }) => {
  const esEdicion = Boolean(proyecto);
  const { catalogos } = useDatos();
  const [datos, setDatos] = useState({
    nombre_proyecto: proyecto?.nombre_proyecto ?? "",
    descripcion: proyecto?.descripcion ?? "",
    fecha_inicio: proyecto?.fecha_inicio ?? "",
    fecha_fin_estimada: proyecto?.fecha_fin_estimada ?? "",
    id_eproyecto: proyecto?.id_eproyecto ?? ESTADO_PLANIFICACION,
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (valor) => setDatos((actuales) => ({ ...actuales, [campo]: valor }));

  const guardar = async (evento) => {
    evento.preventDefault();
    const erroresLocales = validar(datos);
    setErrores(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return;

    const cuerpo = {
      nombre_proyecto: datos.nombre_proyecto.trim(),
      descripcion: oNull(datos.descripcion.trim()),
      fecha_inicio: oNull(datos.fecha_inicio),
      fecha_fin_estimada: oNull(datos.fecha_fin_estimada),
      id_eproyecto: datos.id_eproyecto,
    };

    setGuardando(true);
    try {
      const guardado = esEdicion ? await proyectosApi.actualizar(proyecto.id_proyecto, cuerpo) : await proyectosApi.crear(cuerpo);
      avisarExito(esEdicion ? "Proyecto actualizado" : "Proyecto creado");
      onGuardado(guardado);
    } catch (error) {
      mostrarErrorDeFormulario(error, setErrores);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open onClose={guardando ? undefined : onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={guardar} noValidate>
        <DialogTitle>{esEdicion ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
        <DialogContent>
          <div className="row g-3 pt-2">
            <div className="col-12">
              <CampoTexto
                etiqueta="Nombre"
                valor={datos.nombre_proyecto}
                onChange={cambiar("nombre_proyecto")}
                error={errores.nombre_proyecto}
                inputProps={{ maxLength: 150 }}
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
              <CampoFecha etiqueta="Fecha de inicio" valor={datos.fecha_inicio} onChange={cambiar("fecha_inicio")} error={errores.fecha_inicio} />
            </div>
            <div className="col-12 col-sm-6">
              <CampoFecha
                etiqueta="Fin estimado"
                valor={datos.fecha_fin_estimada}
                onChange={cambiar("fecha_fin_estimada")}
                error={errores.fecha_fin_estimada}
              />
            </div>
            <div className="col-12 col-sm-6">
              <CampoSelect
                etiqueta="Estado"
                valor={datos.id_eproyecto}
                onChange={cambiar("id_eproyecto")}
                opciones={aOpciones(catalogos.estadosProyecto, "id_eproyecto", "nombre_eproyecto")}
                error={errores.id_eproyecto}
                required
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={guardando}>
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear proyecto"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FormularioProyecto;
