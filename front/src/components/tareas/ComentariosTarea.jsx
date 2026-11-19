import { useMemo, useState } from "react";
import { Button, IconButton, Tooltip } from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { confirmarBorrado } from "../../common/alerta";
import { useDatos, useUsuario } from "../../context/contextos";
import { useConsulta } from "../../hooks/useConsulta";
import { proyectosApi, tareasApi, usuariosApi } from "../../services/api";
import { avisarError } from "../../utils/avisos";
import { mostrarFechaHora } from "../../utils/fechas";
import { esAdmin } from "../../utils/permisos";
import AvatarUsuario from "../ui/AvatarUsuario";
import { Consulta, EstadoVacio } from "../ui/Estados";
import CampoComentario from "./CampoComentario";

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Texto del comentario con las menciones (@Nombre Apellido) resaltadas.
// Solo se resaltan las que el back guardó como menciones de ese comentario.
const TextoComentario = ({ comentario }) => {
  const nombres = comentario.menciones.map((mencion) => mencion.nombre_usuario).filter(Boolean);
  if (nombres.length === 0) return <p className="org-texto-largo">{comentario.comentario}</p>;

  // Los nombres más largos primero: si uno contiene a otro, gana el más específico.
  const patron = new RegExp(`(@(?:${nombres.sort((a, b) => b.length - a.length).map(escapar).join("|")}))`, "gi");
  return (
    <p className="org-texto-largo">
      {comentario.comentario.split(patron).map((parte, indice) =>
        indice % 2 === 1 ? (
          <span key={indice} className="org-mencion">
            {parte}
          </span>
        ) : (
          parte
        ),
      )}
    </p>
  );
};

const ComentariosTarea = ({ idTarea, idProyecto, puedeComentar }) => {
  const { usuario } = useUsuario();
  const { refrescar } = useDatos();
  const consulta = useConsulta(() => tareasApi.comentarios(idTarea), [idTarea]);
  // Para etiquetar: todos los usuarios y cuáles ya son integrantes del proyecto.
  const etiquetables = useConsulta(() => usuariosApi.etiquetables(), [], { activa: puedeComentar });
  const integrantes = useConsulta(() => proyectosApi.integrantes(idProyecto), [idProyecto], { activa: puedeComentar });
  const idsIntegrantes = useMemo(() => new Set((integrantes.datos ?? []).map((i) => i.id_usuario)), [integrantes.datos]);

  const [texto, setTexto] = useState("");
  const [mencionados, setMencionados] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const comentar = async (evento) => {
    evento.preventDefault();
    if (texto.trim() === "") return;
    // Solo cuentan las menciones que siguen escritas en el texto (pudo haber borrado alguna).
    const ids_mencionados = [
      ...new Set(
        mencionados.filter((m) => texto.toLowerCase().includes(`@${m.nombre_usuario.toLowerCase()}`)).map((m) => m.id_usuario),
      ),
    ];
    setEnviando(true);
    try {
      consulta.setDatos(await tareasApi.comentar(idTarea, { comentario: texto.trim(), ids_mencionados }));
      setTexto("");
      setMencionados([]);
      // Una mención puede haber sumado un integrante al proyecto: se avisa al resto de la pantalla.
      if (ids_mencionados.length > 0) refrescar();
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
                    <TextoComentario comentario={c} />
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
          <CampoComentario
            label="Escribí un comentario"
            valor={texto}
            onChange={setTexto}
            usuarios={(etiquetables.datos ?? []).filter((u) => u.id_usuario !== usuario.id_usuario)}
            idsIntegrantes={idsIntegrantes}
            onMencionar={(mencionado) => setMencionados((actuales) => [...actuales, mencionado])}
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
