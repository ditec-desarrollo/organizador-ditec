import { useState } from "react";
import { Button, IconButton, Tooltip } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { confirmarBorrado } from "../../common/alerta";
import { useUsuario } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { tareasApi } from "../../services/api";
import { avisarError } from "../../utils/avisos";
import { mostrarFechaHora } from "../../utils/fechas";
import { esAdmin } from "../../utils/permisos";
import AvatarUsuario from "../ui/AvatarUsuario";
import { CampoTexto } from "../ui/Campos";
import { Consulta, EstadoVacio } from "../ui/Estados";

const ComentariosTarea = ({ idTarea, puedeComentar }) => {
  const { usuario } = useUsuario();
  const consulta = useConsulta(() => tareasApi.comentarios(idTarea), [idTarea]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const comentar = async (evento) => {
    evento.preventDefault();
    if (texto.trim() === "") return;
    setEnviando(true);
    try {
      consulta.setDatos(await tareasApi.comentar(idTarea, texto.trim()));
      setTexto("");
    } catch (error) {
      avisarError(error);
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (comentario) => {
    const { isConfirmed } = await confirmarBorrado({ title: "¿Eliminar el comentario?", text: "Esta acción no se puede deshacer." });
    if (!isConfirmed) return;
    try {
      consulta.setDatos(await tareasApi.eliminarComentario(idTarea, comentario.id_tarea_comentario));
    } catch (error) {
      avisarError(error);
    }
  };

  return (
    <>
      <Consulta consulta={consulta}>
        {(comentarios) =>
          comentarios.length === 0 ? (
            <EstadoVacio titulo="Todavía no hay comentarios" />
          ) : (
            <ul className="org-lista">
              {comentarios.map((c) => (
                <li key={c.id_tarea_comentario} className="org-lista__item">
                  <AvatarUsuario nombre={c.nombre_usuario} tamano={30} />
                  <div className="org-lista__cuerpo">
                    <p className="org-lista__meta">
                      <strong>{c.nombre_usuario}</strong> · {mostrarFechaHora(c.fecha_alta)}
                    </p>
                    <p className="org-texto-largo">{c.comentario}</p>
                  </div>
                  {(c.id_usuario === usuario.id_usuario || esAdmin(usuario)) && (
                    <Tooltip title="Eliminar comentario">
                      <IconButton size="small" onClick={() => eliminar(c)} aria-label="Eliminar comentario">
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </Consulta>

      {puedeComentar && (
        <form onSubmit={comentar} className="d-flex flex-column gap-2 mt-3" noValidate>
          <CampoTexto
            etiqueta="Escribí un comentario"
            valor={texto}
            onChange={setTexto}
            multiline
            minRows={2}
            maxRows={8}
            inputProps={{ maxLength: 5000 }}
          />
          <div className="d-flex justify-content-end">
            <Button type="submit" variant="contained" disabled={enviando || texto.trim() === ""}>
              {enviando ? "Enviando…" : "Comentar"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
};

export default ComentariosTarea;
