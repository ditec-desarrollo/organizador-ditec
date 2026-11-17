import { useEffect } from "react";
import { Button, Skeleton } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";
import { useUsuario } from "../context/contextos";
import { EstadoError } from "../components/ui/Estados";
import SinAcceso from "../pages/SinAcceso";
import { esAdmin } from "../utils/permisos";

// Protege las rutas privadas (mismo criterio que Movilidad: sin sesión se vuelve a Ciudad Digital).
//   <Route element={<PrivateRoute />}>…</Route>              -> cualquier usuario habilitado
//   <Route element={<PrivateRoute soloAdmin />}>…</Route>    -> solo administradores
// Esto solo decide qué se muestra: los permisos de verdad los valida el back en cada pedido.
const PrivateRoute = ({ soloAdmin = false }) => {
  const { usuario, cargando, error, autenticado, tieneAcceso, reintentar, cerrarSesion } = useUsuario();
  const sinSesion = !cargando && !error && !autenticado;

  useEffect(() => {
    if (sinSesion) cerrarSesion();
  }, [sinSesion, cerrarSesion]);

  if (cargando || sinSesion) {
    return (
      <div className="org-pagina" aria-busy="true">
        <Skeleton variant="rounded" animation="wave" height={300} sx={{ mt: 4 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="org-pagina">
        <EstadoError error={error} onReintentar={reintentar} />
        <div className="text-center">
          <Button variant="text" onClick={cerrarSesion}>
            Volver a Ciudad Digital
          </Button>
        </div>
      </div>
    );
  }

  if (!tieneAcceso) return <SinAcceso />;
  if (soloAdmin && !esAdmin(usuario)) return <Navigate to="/home" replace />;

  return <Outlet />;
};

export default PrivateRoute;
