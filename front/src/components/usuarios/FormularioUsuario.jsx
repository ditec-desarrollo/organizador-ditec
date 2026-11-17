import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Switch } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useDatos } from "../../context/contextos";
import { usuariosApi } from "../../services/api";
import { avisarError, avisarExito, erroresDeCampo, mensajeDeError } from "../../utils/avisos";
import { aOpciones } from "../../utils/opciones";
import { ROLES } from "../../utils/permisos";
import { CampoSelect, CampoTexto } from "../ui/Campos";

// Alta (sin `usuario`) o edición de un usuario del Organizador.
// Las personas vienen de Ciudad Digital: en el alta se busca por CUIL y se le asigna un rol.
// Nombre, email y contraseña no se editan acá: son de la cuenta de Ciudad Digital.
const FormularioUsuario = ({ usuario, onCerrar, onGuardado }) => {
  const esEdicion = Boolean(usuario);
  const { catalogos } = useDatos();
  const [documento, setDocumento] = useState("");
  const [persona, setPersona] = useState(null);
  const [rol, setRol] = useState(usuario?.id_tusuario ?? ROLES.COLABORADOR);
  const [habilitado, setHabilitado] = useState(usuario ? usuario.habilita === 1 : true);
  const [errores, setErrores] = useState({});
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const buscar = async () => {
    if (!/^\d{11}$/.test(documento)) {
      setErrores({ documento: "El CUIL tiene que tener 11 números, sin guiones" });
      return;
    }
    setBuscando(true);
    setErrores({});
    setPersona(null);
    try {
      setPersona(await usuariosApi.buscarPersona(documento));
    } catch (error) {
      setErrores({ documento: mensajeDeError(error) });
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    try {
      const guardado = esEdicion
        ? await usuariosApi.actualizar(usuario.id_usuario, { id_tusuario: rol, habilita: habilitado ? 1 : 0 })
        : await usuariosApi.crear({ id_persona: persona.id_persona, id_tusuario: rol });
      avisarExito(esEdicion ? "Usuario actualizado" : "Usuario dado de alta");
      onGuardado(guardado);
    } catch (error) {
      setErrores(erroresDeCampo(error));
      avisarError(error);
    } finally {
      setGuardando(false);
    }
  };

  const puedeGuardar = esEdicion || (persona && !persona.ya_registrado);

  return (
    <Dialog open onClose={guardando ? undefined : onCerrar} fullWidth maxWidth="xs">
      <form onSubmit={guardar} noValidate>
        <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        <DialogContent>
          <div className="d-flex flex-column gap-3 pt-2">
            {esEdicion ? (
              <Alert severity="info" icon={false}>
                <strong>
                  {usuario.nombre_persona} {usuario.apellido_persona}
                </strong>
                <br />
                CUIL {usuario.documento_persona}
              </Alert>
            ) : (
              <>
                <div className="d-flex gap-2 align-items-start">
                  <CampoTexto
                    etiqueta="CUIL"
                    valor={documento}
                    onChange={(valor) => setDocumento(valor.replace(/\D/g, "").slice(0, 11))}
                    error={errores.documento}
                    ayuda="11 números, sin guiones"
                    inputProps={{ inputMode: "numeric" }}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter") {
                        evento.preventDefault();
                        buscar();
                      }
                    }}
                    autoFocus
                  />
                  <Button variant="outlined" startIcon={<SearchRoundedIcon />} onClick={buscar} disabled={buscando} sx={{ flex: "none" }}>
                    {buscando ? "Buscando…" : "Buscar"}
                  </Button>
                </div>
                {persona && (
                  <Alert severity={persona.ya_registrado ? "warning" : "success"}>
                    <strong>
                      {persona.nombre_persona} {persona.apellido_persona}
                    </strong>
                    {persona.ya_registrado ? " ya es usuario del Organizador." : ` · ${persona.email_persona ?? "sin email"}`}
                  </Alert>
                )}
              </>
            )}

            <CampoSelect
              etiqueta="Rol"
              valor={rol}
              onChange={setRol}
              opciones={aOpciones(catalogos.tiposUsuario, "id_tusuario", "nombre_tusuario")}
              error={errores.id_tusuario}
            />

            {esEdicion && (
              <FormControlLabel
                control={<Switch checked={habilitado} onChange={(evento) => setHabilitado(evento.target.checked)} />}
                label={habilitado ? "Habilitado" : "Deshabilitado (no puede entrar)"}
              />
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={guardando || !puedeGuardar}>
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Dar de alta"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FormularioUsuario;
