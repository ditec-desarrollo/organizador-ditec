import { Button } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { EstadoVacio } from "../components/ui/Estados";
import { useUsuario } from "../context/contextos";

// La persona inició sesión en Ciudad Digital pero no es usuaria del Organizador (o está deshabilitada).
const SinAcceso = () => {
  const { cerrarSesion } = useUsuario();
  return (
    <main className="org-pagina">
      <div className="cd-superficie" style={{ marginTop: 40 }}>
        <EstadoVacio
          icono={<LockOutlinedIcon />}
          titulo="Todavía no tenés acceso al Organizador"
          texto="Pedile a un administrador que te dé de alta como usuario. Después volvé a entrar desde Ciudad Digital."
          accion={
            <Button variant="outlined" onClick={cerrarSesion} sx={{ mt: 1 }}>
              Volver a Ciudad Digital
            </Button>
          }
        />
      </div>
    </main>
  );
};

export default SinAcceso;
