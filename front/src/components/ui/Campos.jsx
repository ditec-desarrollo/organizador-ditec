import { Checkbox, MenuItem, TextField } from "@mui/material";

// Select de MUI sobre una lista de { valor, texto }.
// `vacio` agrega una primera opción sin valor ("Todos", "Sin responsable"…).
export const CampoSelect = ({ etiqueta, valor, onChange, opciones, vacio, error, ...resto }) => (
  <TextField
    select
    size="small"
    fullWidth
    label={etiqueta}
    value={valor ?? ""}
    onChange={(evento) => onChange(evento.target.value)}
    error={Boolean(error)}
    helperText={error}
    {...resto}
  >
    {vacio !== undefined && <MenuItem value="">{vacio}</MenuItem>}
    {opciones.map((opcion) => (
      <MenuItem key={opcion.valor} value={opcion.valor}>
        {opcion.texto}
      </MenuItem>
    ))}
  </TextField>
);

// Select de varias opciones a la vez. `valor` es la lista de valores elegidos;
// `vacio` es el texto que se muestra cuando no hay ninguno.
export const CampoSeleccionMultiple = ({ etiqueta, valor, onChange, opciones, vacio = "Ninguno", error, ayuda, ...resto }) => (
  <TextField
    select
    size="small"
    fullWidth
    label={etiqueta}
    value={valor}
    onChange={(evento) => onChange(evento.target.value)}
    error={Boolean(error)}
    helperText={error || ayuda}
    InputLabelProps={{ shrink: true }}
    SelectProps={{
      multiple: true,
      displayEmpty: true,
      renderValue: (elegidos) =>
        elegidos.length === 0
          ? vacio
          : opciones
              .filter((opcion) => elegidos.includes(opcion.valor))
              .map((opcion) => opcion.texto)
              .join(", "),
    }}
    {...resto}
  >
    {opciones.map((opcion) => (
      <MenuItem key={opcion.valor} value={opcion.valor} dense>
        <Checkbox size="small" checked={valor.includes(opcion.valor)} sx={{ py: 0, pl: 0 }} />
        {opcion.texto}
      </MenuItem>
    ))}
  </TextField>
);

export const CampoTexto = ({ etiqueta, valor, onChange, error, ayuda, ...resto }) => (
  <TextField
    size="small"
    fullWidth
    label={etiqueta}
    value={valor ?? ""}
    onChange={(evento) => onChange(evento.target.value)}
    error={Boolean(error)}
    helperText={error || ayuda}
    {...resto}
  />
);

export const CampoFecha = (props) => <CampoTexto type="date" InputLabelProps={{ shrink: true }} {...props} />;
