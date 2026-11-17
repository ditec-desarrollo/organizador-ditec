import { createContext, useContext } from "react";

// Los contextos van en un archivo propio para que cada Provider exporte solo su componente
// (fast refresh de Vite), igual que theme/temaContexto.js.

// Sesión: { usuario, cargando, autenticado, tieneAcceso, cerrarSesion }
export const UserContext = createContext(null);
export const useUsuario = () => useContext(UserContext);

// Datos compartidos por toda la app:
//   catalogos             -> estados, prioridades, roles (GET /catalogos)
//   version / refrescar() -> las pantallas vuelven a pedir sus datos cuando algo cambió en otro lado
//   noLeidas              -> cantidad de notificaciones sin leer
//   abrirTarea(id)        -> abre el detalle de una tarea desde cualquier pantalla
export const DatosContext = createContext(null);
export const useDatos = () => useContext(DatosContext);
