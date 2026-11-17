import { claseEstadoProyecto, claseEstadoTarea, clasePrioridad } from "../../utils/estados";

// Chip de color para un valor de catálogo. El color sale del id; el texto, del nombre que manda el back.
const Chip = ({ clase, children, sinPunto = false }) => (
  <span className={`org-chip ${clase}${sinPunto ? " org-chip--sin-punto" : ""}`}>{children}</span>
);

export const ChipEstadoTarea = ({ id, nombre }) => <Chip clase={claseEstadoTarea(id)}>{nombre}</Chip>;

export const ChipPrioridad = ({ id, nombre }) => (
  <Chip clase={clasePrioridad(id)} sinPunto>
    {nombre}
  </Chip>
);

export const ChipEstadoProyecto = ({ id, nombre }) => <Chip clase={claseEstadoProyecto(id)}>{nombre}</Chip>;

export const ChipNeutro = ({ children }) => (
  <Chip clase="org-color--gris" sinPunto>
    {children}
  </Chip>
);
