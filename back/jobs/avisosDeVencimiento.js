import { generarAvisosDeVencimiento } from "../services/notificacionesService.js";

const CADA_UNA_HORA = 60 * 60 * 1000;

const ejecutar = async () => {
  try {
    const creadas = await generarAvisosDeVencimiento();
    if (creadas > 0) console.log(`Avisos de vencimiento: ${creadas} notificación(es) nueva(s)`);
  } catch (error) {
    // Un fallo acá no tiene que tirar el servidor: se reintenta en la próxima vuelta.
    console.error("ERROR al generar avisos de vencimiento:", error.message);
  }
};

// Revisa al arrancar y después una vez por hora qué tareas están por vencer.
// La consulta no repite avisos, así que correrla de más no genera duplicados.
export const iniciarAvisosDeVencimiento = () => {
  ejecutar();
  const intervalo = setInterval(ejecutar, CADA_UNA_HORA);
  intervalo.unref();
  return intervalo;
};

export default iniciarAvisosDeVencimiento;
