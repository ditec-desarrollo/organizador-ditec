import { useEffect, useState } from "react";

// Devuelve el valor recién cuando dejó de cambiar durante `espera` ms.
// Se usa en los buscadores para no pedir a la API con cada tecla.
export const useValorDemorado = (valor, espera = 350) => {
  const [demorado, setDemorado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDemorado(valor), espera);
    return () => clearTimeout(temporizador);
  }, [valor, espera]);

  return demorado;
};

export default useValorDemorado;
