import { useCallback, useEffect, useRef, useState } from "react";
import { useDatos } from "../context/contextos";

// Pide datos a la API y maneja carga, error y recarga.
//   const { datos, cargando, error, recargar } = useConsulta(() => proyectosApi.listar(filtros), [filtros]);
// Vuelve a pedir cuando cambian las `dependencias` o cuando otra pantalla avisa un cambio (refrescar()).
// Si llegan respuestas fuera de orden, solo se usa la del último pedido.
// Con `refrescarCada` (milisegundos) además vuelve a pedir sola cada ese tiempo, sin esqueleto ni parpadeo:
// los datos viejos quedan en pantalla hasta que llegan los nuevos. Con la pestaña oculta no pide;
// al volver a mirarla se pone al día.
export const useConsulta = (pedir, dependencias = [], { activa = true, refrescarCada = 0 } = {}) => {
  const { version } = useDatos();
  const [estado, setEstado] = useState({ datos: null, cargando: activa, error: null });
  const [intento, setIntento] = useState(0);
  const ultimoPedido = useRef(0);
  const pedirActual = useRef(pedir);

  useEffect(() => {
    pedirActual.current = pedir;
  });

  useEffect(() => {
    if (!activa) return;
    const numero = ++ultimoPedido.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marca el inicio del pedido
    setEstado((anterior) => ({ ...anterior, cargando: true, error: null }));

    pedirActual
      .current()
      .then((datos) => {
        if (numero === ultimoPedido.current) setEstado({ datos, cargando: false, error: null });
      })
      .catch((error) => {
        if (numero === ultimoPedido.current) setEstado((anterior) => ({ ...anterior, cargando: false, error }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias las define quien llama
  }, [...dependencias, version, intento, activa]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    if (!activa || !refrescarCada) return;
    let ultimo = Date.now();
    const actualizar = () => {
      if (document.visibilityState !== "visible") return;
      ultimo = Date.now();
      recargar();
    };
    const alVolver = () => {
      if (Date.now() - ultimo >= refrescarCada) actualizar();
    };
    const intervalo = setInterval(actualizar, refrescarCada);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activa, refrescarCada, recargar]);
  const setDatos = useCallback((datos) => setEstado((anterior) => ({ ...anterior, datos })), []);

  return { ...estado, recargar, setDatos };
};

export default useConsulta;
