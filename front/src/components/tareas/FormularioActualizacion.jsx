import { useState } from "react";
import { Button, Slider } from "@mui/material";
import { useDatos } from "../../context/contextos";
import { tareasApi } from "../../services/api";
import { avisarExito, mostrarErrorDeFormulario } from "../../utils/avisos";
import { TIPOS_ACTUALIZACION } from "../../utils/estados";
import { aOpciones } from "../../utils/opciones";
import { CampoSelect, CampoTexto } from "../ui/Campos";

// Registro de seguimiento: el responsable (o quien gestiona) informa avance, estado, novedades o dificultades.
// Cada envío queda como una fila nueva en el historial de la tarea.
const FormularioActualizacion = ({ tarea, onGuardada }) => {
  const { catalogos } = useDatos();
  const [tipo, setTipo] = useState(TIPOS_ACTUALIZACION.AVANCE);
  const [estado, setEstado] = useState(tarea.id_etarea);
  const [porcentaje, setPorcentaje] = useState(tarea.porcentaje_avance);
  const [comentario, setComentario] = useState("");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  // "Cambio de estado" lo registra el tablero al mover la tarjeta: acá no se ofrece.
  const tipos = aOpciones(
    catalogos.tiposActualizacion.filter((t) => t.id_tactualizacion !== TIPOS_ACTUALIZACION.CAMBIO_ESTADO),
    "id_tactualizacion",
    "nombre_tactualizacion",
  );
  const estados = aOpciones(catalogos.estadosTarea, "id_etarea", "nombre_etarea");
  const estadoFinal = catalogos.estadosTarea.find((e) => e.id_etarea === estado)?.es_final === 1;
  const necesitaComentario = tipo !== TIPOS_ACTUALIZACION.AVANCE;
  const hayCambios = estado !== tarea.id_etarea || porcentaje !== tarea.porcentaje_avance || comentario.trim() !== "";

  const guardar = async (evento) => {
    evento.preventDefault();
    if (necesitaComentario && comentario.trim() === "") {
      setErrores({ comentario: "Contá qué pasó" });
      return;
    }
    setGuardando(true);
    setErrores({});
    try {
      await tareasApi.registrarActualizacion(tarea.id_tarea, {
        id_tactualizacion: tipo,
        id_etarea: estado,
        porcentaje_avance: estadoFinal ? 100 : porcentaje,
        comentario: comentario.trim() || null,
      });
      avisarExito("Actualización registrada");
      setComentario("");
      onGuardada();
    } catch (error) {
      mostrarErrorDeFormulario(error, setErrores);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <CampoSelect etiqueta="Tipo de actualización" valor={tipo} onChange={setTipo} opciones={tipos} error={errores.id_tactualizacion} />
        </div>
        <div className="col-12 col-sm-6">
          <CampoSelect etiqueta="Estado" valor={estado} onChange={setEstado} opciones={estados} error={errores.id_etarea} />
        </div>
        <div className="col-12">
          <label id="etiqueta-avance" className="org-lista__meta">
            Avance: {estadoFinal ? 100 : porcentaje} %
          </label>
          <Slider
            aria-labelledby="etiqueta-avance"
            value={estadoFinal ? 100 : porcentaje}
            onChange={(_, valor) => setPorcentaje(valor)}
            step={5}
            min={0}
            max={100}
            disabled={estadoFinal}
            valueLabelDisplay="auto"
          />
        </div>
        <div className="col-12">
          <CampoTexto
            etiqueta={necesitaComentario ? "¿Qué pasó?" : "Comentario (opcional)"}
            valor={comentario}
            onChange={setComentario}
            error={errores.comentario}
            multiline
            minRows={2}
            maxRows={8}
            inputProps={{ maxLength: 5000 }}
          />
        </div>
        <div className="col-12 d-flex justify-content-end">
          <Button type="submit" variant="contained" disabled={guardando || !hayCambios}>
            {guardando ? "Guardando…" : "Registrar actualización"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default FormularioActualizacion;
