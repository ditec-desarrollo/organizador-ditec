// Arma el mail que recibe alguien cuando lo etiquetan con @ en un comentario.
// Es una función pura (sin envío ni base) para poder probarla sola.

const escaparHtml = (valor) =>
  String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// El asunto va en una cabecera: sin saltos de línea y con largo acotado.
const enUnaLinea = (valor, maximo) => {
  const texto = String(valor ?? "").replace(/\s+/g, " ").trim();
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
};

export const esEmailValido = (email) => typeof email === "string" && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email.trim());

export const armarEmailDeMencion = ({ autor, id_tarea, titulo, proyecto, comentario, urlFront }) => {
  const quien = autor?.trim() || "Alguien";
  // El front abre el detalle de una tarea con ?tarea=<id> desde cualquier pantalla.
  const enlace = urlFront ? `${urlFront}/#/home?tarea=${Number(id_tarea)}` : "";

  const asunto = enUnaLinea(`${quien} te mencionó en la tarea "${titulo}"`, 150);

  const texto = [
    `${quien} te mencionó en un comentario de la tarea "${titulo}" del proyecto "${proyecto}".`,
    "",
    comentario,
    "",
    enlace ? `Ver la tarea: ${enlace}` : "Ingresá al Organizador desde Ciudad Digital para verlo.",
    "",
    "Este es un mensaje automático, no lo respondas.",
  ].join("\n");

  const boton = enlace
    ? `<p style="margin:24px 0 0"><a href="${escaparHtml(enlace)}" style="background:#1565c0;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block">Ver la tarea</a></p>`
    : `<p style="margin:24px 0 0">Ingresá al Organizador desde Ciudad Digital para verlo.</p>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222222;max-width:560px">
  <p style="margin:0 0 12px"><strong>${escaparHtml(quien)}</strong> te mencionó en un comentario.</p>
  <p style="margin:0 0 4px"><strong>Tarea:</strong> ${escaparHtml(titulo)}</p>
  <p style="margin:0 0 16px"><strong>Proyecto:</strong> ${escaparHtml(proyecto)}</p>
  <blockquote style="margin:0;padding:10px 14px;border-left:4px solid #1565c0;background:#f3f6fa;white-space:pre-wrap">${escaparHtml(comentario)}</blockquote>
  ${boton}
  <p style="margin:24px 0 0;font-size:12px;color:#777777">Este es un mensaje automático, no lo respondas.</p>
</div>`;

  return { asunto, texto, html };
};

export default armarEmailDeMencion;
