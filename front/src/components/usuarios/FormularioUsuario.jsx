import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Switch,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useDatos } from "../../context/contextos";
import { usuariosApi } from "../../services/api";
import { avisarError, avisarExito, erroresDeCampo, mensajeDeError } from "../../utils/avisos";
import { aOpciones } from "../../utils/opciones";
import { ROLES } from "../../utils/permisos";
import { CampoSelect, CampoTexto } from "../ui/Campos";

// Alta (sin `usuario`) o edición de un usuario del Organizador.
// Las personas vienen de Ciudad Digital: en el alta se busca por N° de afiliado, nombre, apellido,
// CUIL o email, se elige a la persona entre las coincidencias y se le asigna un rol.
// Nombre, email y contraseña no se editan acá: son de la cuenta de Ciudad Digital.
const FormularioUsuario = ({ usuario, onCerrar, onGuardado }) => {
  const esEdicion = Boolean(usuario);
  const { catalogos } = useDatos();
  const [busqueda, setBusqueda] = useState("");
  // null = todavía no se buscó · { personas, hay_mas } = lo que devolvió la última búsqueda
  const [resultado, setResultado] = useState(null);
  const [persona, setPersona] = useState(null);
  const [rol, setRol] = useState(usuario?.id_tusuario ?? ROLES.COLABORADOR);
  const [habilitado, setHabilitado] = useState(usuario ? usuario.habilita === 1 : true);
  const [errores, setErrores] = useState({});
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const buscar = async () => {
    const texto = busqueda.trim();
    if (texto.length < 3) {
      setErrores({ buscar: "Escribí al menos 3 caracteres" });
      return;
    }
    setBuscando(true);
    setErrores({});
    setPersona(null);
    setResultado(null);
    try {
      const encontrado = await usuariosApi.buscarPersonas(texto);
      setResultado(encontrado);
      // Si hay una sola persona y se puede dar de alta, queda elegida sin un clic de más.
      const disponibles = encontrado.personas.filter((p) => !p.ya_registrado);
      if (encontrado.personas.length === 1 && disponibles.length === 1) setPersona(disponibles[0]);
    } catch (error) {
      setErrores({ buscar: erroresDeCampo(error).buscar ?? mensajeDeError(error) });
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
    <Dialog open onClose={guardando ? undefined : onCerrar} fullWidth maxWidth={esEdicion ? "xs" : "sm"}>
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
                    etiqueta="Buscar persona"
                    placeholder="Afiliado, nombre, apellido o CUIL"
                    valor={busqueda}
                    onChange={setBusqueda}
                    error={errores.buscar}
                    ayuda="N° de afiliado, nombre, apellido, CUIL (sin guiones) o email"
                    inputProps={{ maxLength: 100 }}
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
                {resultado && resultado.personas.length === 0 && (
                  <Alert severity="warning">No hay ninguna persona registrada en Ciudad Digital que coincida con la búsqueda.</Alert>
                )}
                {resultado && resultado.personas.length > 0 && (
                  <>
                    <List dense disablePadding aria-label="Personas encontradas" sx={{ maxHeight: 280, overflowY: "auto" }}>
                      {resultado.personas.map((encontrada) => (
                        <ListItemButton
                          key={encontrada.id_persona}
                          selected={persona?.id_persona === encontrada.id_persona}
                          disabled={encontrada.ya_registrado}
                          onClick={() => setPersona(encontrada)}
                        >
                          <ListItemText
                            primary={`${encontrada.nombre_persona ?? ""} ${encontrada.apellido_persona ?? ""}`.trim() || "Sin nombre"}
                            secondary={[
                              encontrada.ya_registrado && "Ya es usuario del Organizador",
                              `CUIL ${encontrada.documento_persona ?? "—"}`,
                              encontrada.afiliado && `Afiliado ${encontrada.afiliado}`,
                              encontrada.email_persona,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                    {resultado.hay_mas && (
                      <Alert severity="info">Hay más coincidencias: se muestran las primeras {resultado.personas.length}. Afiná la búsqueda si no aparece.</Alert>
                    )}
                    {!persona && resultado.personas.some((p) => !p.ya_registrado) && (
                      <span className="org-celda-secundaria">Elegí a la persona que querés dar de alta.</span>
                    )}
                  </>
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
