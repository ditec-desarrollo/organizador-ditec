import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { EstadoVacio } from "../components/ui/Estados";

const NoEncontrada = () => {
  const navigate = useNavigate();
  return (
    <main className="org-pagina">
      <div className="cd-superficie" style={{ marginTop: 40 }}>
        <EstadoVacio
          titulo="Esa página no existe"
          texto="Puede que el enlace esté mal escrito o que la página se haya movido."
          accion={
            <Button variant="contained" onClick={() => navigate("/home")} sx={{ mt: 1 }}>
              Ir al inicio
            </Button>
          }
        />
      </div>
    </main>
  );
};

export default NoEncontrada;
