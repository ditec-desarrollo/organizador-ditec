// Tarjeta con título y, opcionalmente, una acción a la derecha.
const Bloque = ({ titulo, accion, children, className = "" }) => (
  <section className={`cd-superficie org-bloque ${className}`.trim()}>
    {(titulo || accion) && (
      <div className="org-bloque__cabecera">
        {titulo && <h2 className="org-bloque__titulo">{titulo}</h2>}
        {accion}
      </div>
    )}
    {children}
  </section>
);

export default Bloque;
