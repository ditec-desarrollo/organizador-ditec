import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DatosContext, useUsuario } from "./contextos";
import { notificacionesApi, sesionApi } from "../services/api";

const CADA_UN_MINUTO = 60 * 1000;
const CATALOGOS_VACIOS = {
  tiposUsuario: [],
  estadosProyecto: [],
  estadosTarea: [],
  prioridades: [],
  tiposActualizacion: [],
  configuracion: { dias_aviso_vencimiento: 2, dias_finalizadas_en_tablero: 7 },
};

const ProveedorDatos = ({ children }) => {
  const { tieneAcceso } = useUsuario();
  const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS);
  const [version, setVersion] = useState(0);
  const [noLeidas, setNoLeidas] = useState(0);
  const [parametros, setParametros] = useSearchParams();

  const refrescar = useCallback(() => setVersion((v) => v + 1), []);

  // Catálogos: no cambian durante la sesión, se piden una sola vez.
  useEffect(() => {
    if (!tieneAcceso) return;
    sesionApi
      .catalogos()
      .then((datos) => setCatalogos({ ...CATALOGOS_VACIOS, ...datos }))
      .catch(() => setCatalogos(CATALOGOS_VACIOS));
  }, [tieneAcceso]);

  // Notificaciones sin leer: al entrar, cada minuto y cada vez que algo cambia.
  const actualizarNoLeidas = useCallback(() => {
    notificacionesApi
      .resumen()
      .then((resumen) => setNoLeidas(resumen.no_leidas))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!tieneAcceso) return;
    actualizarNoLeidas();
    const intervalo = setInterval(actualizarNoLeidas, CADA_UN_MINUTO);
    return () => clearInterval(intervalo);
  }, [tieneAcceso, version, actualizarNoLeidas]);

  // El detalle de tarea se abre con ?tarea=<id> en la URL: funciona desde cualquier pantalla
  // y el link se puede compartir.
  const idTareaAbierta = Number(parametros.get("tarea")) || null;

  const abrirTarea = useCallback(
    (id_tarea) => {
      setParametros((actuales) => {
        const nuevos = new URLSearchParams(actuales);
        nuevos.set("tarea", id_tarea);
        return nuevos;
      });
    },
    [setParametros],
  );

  const cerrarTarea = useCallback(() => {
    setParametros(
      (actuales) => {
        const nuevos = new URLSearchParams(actuales);
        nuevos.delete("tarea");
        return nuevos;
      },
      { replace: true },
    );
  }, [setParametros]);

  const valor = useMemo(
    () => ({ catalogos, version, refrescar, noLeidas, setNoLeidas, idTareaAbierta, abrirTarea, cerrarTarea }),
    [catalogos, version, refrescar, noLeidas, idTareaAbierta, abrirTarea, cerrarTarea],
  );

  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>;
};

export default ProveedorDatos;
