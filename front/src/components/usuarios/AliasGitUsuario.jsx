import { useState } from "react";
import { Button, Chip, Skeleton } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useConsulta } from "../../hooks/useConsulta";
import { usuariosApi } from "../../services/api";
import { avisarError, erroresDeCampo, mensajeDeError } from "../../utils/avisos";
import { CampoTexto } from "../ui/Campos";

// Con qué nombre o email firma sus commits un usuario. Sirve para saber de quién es cada commit
// que avisa Claude Code y dejarle a esa persona la tarea que genera.
// Va dentro del formulario de edición del usuario, así que no es un <form> propio:
// cada alta y cada baja se guardan en el momento.
const AliasGitUsuario = ({ usuario }) => {
  const consulta = useConsulta(() => usuariosApi.aliasGit(usuario.id_usuario), [usuario.id_usuario]);
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async () => {
    const texto = alias.trim();
    if (texto.length < 2) {
      setError("Escribí el nombre o el email con el que firma en git");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      consulta.setDatos(await usuariosApi.agregarAliasGit(usuario.id_usuario, texto));
      setAlias("");
    } catch (fallo) {
      setError(erroresDeCampo(fallo).alias ?? mensajeDeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (item) => {
    try {
      consulta.setDatos(await usuariosApi.quitarAliasGit(usuario.id_usuario, item.id_usuario_alias_git));
    } catch (fallo) {
      avisarError(fallo);
    }
  };

  return (
    <section aria-label="Identidades de git">
      <span className="org-celda-principal">Identidades de git</span>
      <span className="org-celda-secundaria" style={{ marginBottom: 8 }}>
        El nombre o el email con el que firma sus commits (<code>git config user.name</code> / <code>user.email</code>). Si firma con
        su email de Ciudad Digital no hace falta cargarlo.
      </span>

      {!consulta.datos ? (
        consulta.error ? (
          <span className="org-celda-secundaria">{mensajeDeError(consulta.error)}</span>
        ) : (
          <Skeleton variant="rounded" animation="wave" height={28} />
        )
      ) : (
        <div className="d-flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
          {consulta.datos.length === 0 && <span className="org-celda-secundaria">Todavía no tiene ninguna cargada.</span>}
          {consulta.datos.map((item) => (
            <Chip key={item.id_usuario_alias_git} label={item.alias} size="small" onDelete={() => quitar(item)} />
          ))}
        </div>
      )}

      <div className="d-flex gap-2 align-items-start">
        <CampoTexto
          etiqueta="Agregar identidad"
          placeholder="nombre o email de git"
          valor={alias}
          onChange={setAlias}
          error={error}
          inputProps={{ maxLength: 190 }}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              agregar();
            }
          }}
        />
        <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={agregar} disabled={guardando} sx={{ flex: "none" }}>
          Agregar
        </Button>
      </div>
    </section>
  );
};

export default AliasGitUsuario;
