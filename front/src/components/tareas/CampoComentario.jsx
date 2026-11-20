import { useRef, useState } from "react";
import { MenuItem, MenuList, Paper, Popper, TextField } from "@mui/material";

const MAXIMO_SUGERENCIAS = 6;

// Lo que se está escribiendo después del último "@" antes del cursor (o null si no hay una mención en curso).
// El "@" tiene que estar al principio o después de un espacio, para no confundirlo con un email.
const mencionEnCurso = (texto, cursor) => {
  const hasta = texto.slice(0, cursor);
  const arroba = hasta.lastIndexOf("@");
  if (arroba === -1) return null;
  if (arroba > 0 && !/\s/.test(hasta[arroba - 1])) return null;
  const consulta = hasta.slice(arroba + 1);
  if (consulta.includes("\n") || consulta.length > 40) return null;
  return { desde: arroba, consulta };
};

// Campo de comentario con etiquetas: al escribir "@" sugiere usuarios; al elegir uno
// inserta "@Nombre Apellido" y avisa con onMencionar para que quien lo usa recuerde el id.
//   usuarios        -> [{ id_usuario, nombre_usuario }] a quienes se puede etiquetar
//   idsIntegrantes  -> Set con los que ya son integrantes del proyecto (el resto se suma al etiquetarlo)
const CampoComentario = ({ valor, onChange, usuarios, idsIntegrantes, onMencionar, ...resto }) => {
  const campo = useRef(null);
  // El contenedor del campo, para ubicar la lista de sugerencias (en estado y no en un ref: se usa al pintar).
  const [ancla, setAncla] = useState(null);
  const [mencion, setMencion] = useState(null);
  const [resaltada, setResaltada] = useState(0);

  const sugerencias = mencion
    ? usuarios
        .filter((u) => u.nombre_usuario && u.nombre_usuario.toLowerCase().includes(mencion.consulta.toLowerCase()))
        .slice(0, MAXIMO_SUGERENCIAS)
    : [];
  const abierto = sugerencias.length > 0;

  const actualizar = (texto, cursor) => {
    onChange(texto);
    setMencion(mencionEnCurso(texto, cursor));
    setResaltada(0);
  };

  const elegir = (usuario) => {
    const cursor = campo.current.selectionStart;
    const insertado = `@${usuario.nombre_usuario} `;
    const texto = valor.slice(0, mencion.desde) + insertado + valor.slice(cursor);
    const nuevoCursor = mencion.desde + insertado.length;
    onChange(texto);
    onMencionar(usuario);
    setMencion(null);
    // El cursor se acomoda después de que React vuelva a pintar el texto.
    requestAnimationFrame(() => {
      campo.current?.focus();
      campo.current?.setSelectionRange(nuevoCursor, nuevoCursor);
    });
  };

  const alPresionar = (evento) => {
    if (!abierto) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setResaltada((i) => (i + 1) % sugerencias.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setResaltada((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (evento.key === "Enter" || evento.key === "Tab") {
      evento.preventDefault();
      elegir(sugerencias[resaltada]);
    } else if (evento.key === "Escape") {
      evento.stopPropagation();
      setMencion(null);
    }
  };

  return (
    <>
      <TextField
        size="small"
        fullWidth
        multiline
        minRows={2}
        maxRows={8}
        value={valor}
        ref={setAncla}
        inputRef={campo}
        onChange={(evento) => actualizar(evento.target.value, evento.target.selectionStart)}
        onKeyDown={alPresionar}
        onBlur={() => setMencion(null)}
        helperText="Escribí @ para etiquetar a alguien"
        inputProps={{ maxLength: 5000, "aria-autocomplete": "list", "aria-expanded": abierto }}
        {...resto}
      />
      <Popper
        open={abierto}
        anchorEl={ancla}
        placement="top-start"
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <Paper elevation={0} className="org-menciones">
          <MenuList dense aria-label="Usuarios para etiquetar">
            {sugerencias.map((usuario, indice) => (
              <MenuItem
                key={usuario.id_usuario}
                selected={indice === resaltada}
                // onMouseDown y no onClick: el click sacaría el foco del campo antes de elegir.
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  elegir(usuario);
                }}
              >
                <span className="org-lista__cuerpo">
                  <span className="org-lista__texto">{usuario.nombre_usuario}</span>
                  {!idsIntegrantes.has(usuario.id_usuario) && (
                    <span className="org-lista__meta">No es integrante: se suma al proyecto</span>
                  )}
                </span>
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>
    </>
  );
};

export default CampoComentario;
