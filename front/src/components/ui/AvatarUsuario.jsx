import { Avatar, Tooltip } from "@mui/material";

const iniciales = (nombre = "") =>
  nombre
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

// Avatar con las iniciales (mismo estilo que el del header).
const AvatarUsuario = ({ nombre, tamano = 24 }) => (
  <Tooltip title={nombre || "Sin responsable"}>
    <Avatar
      sx={{
        width: tamano,
        height: tamano,
        fontSize: tamano * 0.42,
        fontWeight: 600,
        bgcolor: nombre ? "var(--cd-accent-suave)" : "var(--cd-hover)",
        color: nombre ? "var(--cd-accent-fuerte)" : "var(--cd-text-3)",
      }}
    >
      {nombre ? iniciales(nombre) : "?"}
    </Avatar>
  </Tooltip>
);

export default AvatarUsuario;
