// Indicador de progreso (0 a 100). Se pinta de verde al llegar al 100 %.
const BarraAvance = ({ valor = 0, conValor = true }) => {
  const porcentaje = Math.min(100, Math.max(0, Number(valor) || 0));
  return (
    <div
      className="org-avance"
      role="progressbar"
      aria-valuenow={porcentaje}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Avance: ${porcentaje} %`}
    >
      <div className="org-avance__pista">
        <div
          className={`org-avance__relleno${porcentaje === 100 ? " org-avance__relleno--completo" : ""}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      {conValor && <span className="org-avance__valor">{porcentaje} %</span>}
    </div>
  );
};

export default BarraAvance;
