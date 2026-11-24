// Cómo se convierte el mensaje de un commit en una tarea. Sin base de datos: se prueba en test/commits.test.js.

const MAX_TITULO = 200; // tarea.titulo
const MAX_DESCRIPCION = 5000; // mismo tope que el formulario de tareas

const primeraLinea = (mensaje) => String(mensaje ?? "").split(/\r?\n/, 1)[0].trim();

export const shaCorto = (commit_sha) => String(commit_sha).slice(0, 7);

// Los merges no son trabajo nuevo: lo que traen ya entró con sus propios commits.
const MENSAJE_DE_MERGE = /^merge (pull request|branch|branches|remote-tracking branch|tag|commit)\b/i;
export const esMerge = (mensaje) => MENSAJE_DE_MERGE.test(primeraLinea(mensaje));

// "tarea #12" en cualquier parte del mensaje: el commit es un avance de esa tarea, no una tarea nueva.
// Se exige la palabra "tarea" porque "#12" solo suele ser un issue o un pull request de GitHub.
const TAREA_REFERIDA = /\btarea\s*#\s*(\d{1,9})\b/i;
export const tareaReferida = (mensaje) => {
  const partes = TAREA_REFERIDA.exec(String(mensaje ?? ""));
  return partes ? Number(partes[1]) : null;
};

// El commit además termina la tarea si lo dice con un verbo de cierre pegado a la referencia:
//   "finaliza tarea #12", "cierra la tarea #12", "terminé la tarea #12", "completa tarea #12"
//   "tarea #12 finalizada", "tarea #12 cerrada", "tarea #12 terminada", "tarea #12 completada"
// Sin ese verbo ("avance en tarea #12") la tarea solo recibe la novedad y sigue abierta.
// "lista" no cuenta a propósito: "tarea #12 lista para revisar" no es una tarea terminada.
const LETRAS = "[a-záéíóúñ]*";
const VERBO_DE_CIERRE = `(?:finaliz|cierr|cerr|termin|complet)${LETRAS}`;
const NUMERO = "#\\s*(\\d{1,9})(?!\\d)";
const CIERRE_ANTES = new RegExp(`(?:^|[^a-záéíóúñ])${VERBO_DE_CIERRE}\\s+(?:la\\s+)?tarea\\s*${NUMERO}`, "i");
const CIERRE_DESPUES = new RegExp(`\\btarea\\s*${NUMERO}\\s+(?:finaliz|cerr|termin|complet)ada(?![a-záéíóúñ])`, "i");

// true si el mensaje pide finalizar esa tarea (la misma que devuelve tareaReferida).
export const finalizaTarea = (mensaje, id_tarea) => {
  const texto = String(mensaje ?? "");
  const partes = CIERRE_ANTES.exec(texto) ?? CIERRE_DESPUES.exec(texto);
  return Boolean(partes) && Number(partes[1]) === id_tarea;
};

// El título es la primera línea del mensaje. La tarea exige al menos 3 caracteres:
// un mensaje más corto ("ok") se completa con el hash para que se pueda identificar.
export const tituloDeCommit = (mensaje, commit_sha) => {
  const linea = primeraLinea(mensaje);
  const titulo = linea.length >= 3 ? linea : `Commit ${shaCorto(commit_sha)}${linea ? `: ${linea}` : ""}`;
  return titulo.length > MAX_TITULO ? `${titulo.slice(0, MAX_TITULO - 1)}…` : titulo;
};

// Líneas que agrega git o la herramienta, no la persona.
const LINEA_AUTOMATICA = /^(co-authored-by|signed-off-by):|generated with \[claude code\]/i;

// Resto del mensaje (sin la primera línea ni las firmas automáticas).
export const cuerpoDeCommit = (mensaje) =>
  String(mensaje ?? "")
    .split(/\r?\n/)
    .slice(1)
    .filter((linea) => !LINEA_AUTOMATICA.test(linea.trim()))
    .join("\n")
    .trim();

// De dónde salió: "Commit a1b2c3d · github.com/ditec-desarrollo/gaf-backend · rama main".
export const origenDeCommit = ({ commit_sha, repositorio, rama }) =>
  [`Commit ${shaCorto(commit_sha)}`, repositorio, rama && `rama ${rama}`].filter(Boolean).join(" · ");

// Descripción de la tarea que se crea: el cuerpo del mensaje y, al final, el origen.
export const descripcionDeCommit = (commit) => {
  const origen = origenDeCommit(commit);
  const cuerpo = cuerpoDeCommit(commit.mensaje);
  if (!cuerpo) return origen;
  const lugar = MAX_DESCRIPCION - origen.length - 2;
  return `${cuerpo.length > lugar ? `${cuerpo.slice(0, lugar - 1)}…` : cuerpo}\n\n${origen}`;
};

// Comentario de la novedad cuando el commit avanza una tarea que ya existía: el mensaje completo y el origen.
export const novedadDeCommit = (commit) => {
  const origen = origenDeCommit(commit);
  const texto = [primeraLinea(commit.mensaje), cuerpoDeCommit(commit.mensaje)].filter(Boolean).join("\n\n");
  const lugar = MAX_DESCRIPCION - origen.length - 2;
  return `${texto.length > lugar ? `${texto.slice(0, lugar - 1)}…` : texto}\n\n${origen}`;
};

// La fecha llega como la escribe git (ISO 8601 con zona: "2026-11-24T10:15:30-03:00").
// Se guarda la hora local de quien hizo el commit, sin convertir: es la que esa persona vio en su reloj.
export const fechaHoraLocal = (fecha) => (fecha ? `${fecha.slice(0, 10)} ${fecha.slice(11, 19)}` : null);
