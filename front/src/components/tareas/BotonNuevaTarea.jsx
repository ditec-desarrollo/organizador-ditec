import { useState } from "react";
import { Button } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useDatos, useUsuario } from "../../context/contextos";
import { esGestor } from "../../utils/permisos";
import FormularioTarea from "./FormularioTarea";

// Botón "Nueva tarea" con su formulario. Solo lo ven administradores y supervisores.
// `idProyecto` deja fijo el proyecto (cuando se usa dentro del detalle de un proyecto).
const BotonNuevaTarea = ({ idProyecto, variant = "contained" }) => {
  const { usuario } = useUsuario();
  const { refrescar } = useDatos();
  const [abierto, setAbierto] = useState(false);

  if (!esGestor(usuario)) return null;

  return (
    <>
      <Button variant={variant} startIcon={<AddRoundedIcon />} onClick={() => setAbierto(true)}>
        Nueva tarea
      </Button>
      {abierto && (
        <FormularioTarea
          idProyecto={idProyecto}
          onCerrar={() => setAbierto(false)}
          onGuardada={() => {
            setAbierto(false);
            refrescar();
          }}
        />
      )}
    </>
  );
};

export default BotonNuevaTarea;
