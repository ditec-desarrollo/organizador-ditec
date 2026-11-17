// Convierte un catálogo del back en opciones para <CampoSelect>:
//   aOpciones(prioridades, "id_prioridad", "nombre_prioridad") -> [{ valor, texto }]
export const aOpciones = (lista, campoValor, campoTexto) =>
  (lista ?? []).map((item) => ({ valor: item[campoValor], texto: item[campoTexto] }));

// Un select vacío manda "" ; la API espera null.
export const oNull = (valor) => (valor === "" || valor === undefined ? null : valor);

// Filtros de tareas sin nada elegido (tablero y lista). "" = sin filtrar.
export const FILTROS_TAREA_VACIOS = {
  buscar: "",
  id_proyecto: "",
  id_usuario_responsable: "",
  id_etarea: "",
  id_prioridad: "",
  vencimiento: "",
  vence_desde: "",
  vence_hasta: "",
  mias: "",
};
