import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import ProviderUser from "./context/UserContext";
import ProveedorDatos from "./context/ProveedorDatos";
import LayoutPrincipal from "./layouts/LayoutPrincipal";
import PrivateRoute from "./routes/PrivateRoute";
import Inicio from "./pages/Inicio";
import Proyectos from "./pages/Proyectos";
import ProyectoDetalle from "./pages/ProyectoDetalle";
import TableroGeneral from "./pages/TableroGeneral";
import Tareas from "./pages/Tareas";
import Notificaciones from "./pages/Notificaciones";
import Usuarios from "./pages/Usuarios";
import NoEncontrada from "./pages/NoEncontrada";

// Ciudad Digital abre la app con ?auth=<token> (igual que Movilidad y Mapa Interactivo).
// Se guarda el token y se saca de la URL para que no quede en el historial ni se comparta por error.
const tomarTokenDeLaUrl = () => {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("auth");
  if (!token) return;
  localStorage.setItem("token", token);
  url.searchParams.delete("auth");
  window.history.replaceState(null, "", url.toString());
};

tomarTokenDeLaUrl();

const App = () => (
  <HashRouter>
    <ProviderUser>
      <ProveedorDatos>
        <Routes>
          <Route element={<LayoutPrincipal />}>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Inicio />} />
              <Route path="/proyectos" element={<Proyectos />} />
              <Route path="/proyectos/:id_proyecto" element={<ProyectoDetalle />} />
              <Route path="/tablero" element={<TableroGeneral />} />
              <Route path="/tareas" element={<Tareas />} />
              <Route path="/notificaciones" element={<Notificaciones />} />
              <Route path="*" element={<NoEncontrada />} />
            </Route>
            <Route element={<PrivateRoute soloAdmin />}>
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Route>
        </Routes>
      </ProveedorDatos>
    </ProviderUser>
  </HashRouter>
);

export default App;
