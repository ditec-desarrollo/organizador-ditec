import { useCallback, useEffect, useMemo, useState } from "react";
import { UserContext } from "./contextos";
import { salirACiudadDigital } from "../config/axios";
import { sesionApi } from "../services/api";

// Basado en Movilidad-Urbana-Front/src/context/UserContext.jsx.
// El login lo hace Ciudad Digital: acá solo se valida el token guardado (App.jsx lo toma de ?auth=)
// y se trae el usuario. La sesión se valida una vez al cargar la app, no en cada ruta.
const ProviderUser = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const validarSesion = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setCargando(false);
      return;
    }
    try {
      setError(null);
      setUsuario(await sesionApi.estado());
    } catch (e) {
      // Un 401 "Invalid token" ya lo resuelve el interceptor de axios (vuelve al portal).
      // Cualquier otra falla (back caído, sin red) se muestra con opción de reintentar.
      setUsuario(null);
      if (e.response?.status !== 401) setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de la sesión
    validarSesion();
  }, [validarSesion]);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      error,
      autenticado: Boolean(usuario),
      // La persona existe en Ciudad Digital pero puede no haber sido dada de alta en el Organizador.
      tieneAcceso: Boolean(usuario?.id_usuario),
      nombreCompleto: usuario ? `${usuario.nombre_persona ?? ""} ${usuario.apellido_persona ?? ""}`.trim() : "",
      reintentar: () => {
        setCargando(true);
        validarSesion();
      },
      cerrarSesion: salirACiudadDigital,
    }),
    [usuario, cargando, error, validarSesion],
  );

  return <UserContext.Provider value={valor}>{children}</UserContext.Provider>;
};

export default ProviderUser;
