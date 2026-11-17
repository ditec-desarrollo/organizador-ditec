// El back manda las fechas como texto: "AAAA-MM-DD" o "AAAA-MM-DD HH:MM:SS".
// Se arman a mano (sin new Date) para que no se corran por la zona horaria.

export const mostrarFecha = (texto) => {
  if (!texto) return "—";
  const [anio, mes, dia] = texto.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
};

export const mostrarFechaHora = (texto) => {
  if (!texto) return "—";
  const hora = texto.slice(11, 16);
  return hora ? `${mostrarFecha(texto)} ${hora}` : mostrarFecha(texto);
};

// Texto del vencimiento de una tarea a partir de dias_para_vencer (lo calcula el back).
export const textoVencimiento = (tarea) => {
  if (!tarea.fecha_vencimiento) return "Sin vencimiento";
  if (tarea.es_final === 1) return mostrarFecha(tarea.fecha_vencimiento);
  const dias = tarea.dias_para_vencer;
  if (dias < 0) return `Venció hace ${-dias} día${dias === -1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return mostrarFecha(tarea.fecha_vencimiento);
};

// "vencida" | "proxima" | null, para elegir el color del vencimiento.
export const alertaVencimiento = (tarea, diasProximas = 2) => {
  if (!tarea.fecha_vencimiento || tarea.es_final === 1) return null;
  if (tarea.dias_para_vencer < 0) return "vencida";
  if (tarea.dias_para_vencer <= diasProximas) return "proxima";
  return null;
};
