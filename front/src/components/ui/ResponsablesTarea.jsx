import { nombresDeResponsables } from "../../utils/opciones";
import AvatarUsuario from "./AvatarUsuario";

const MAXIMO_AVATARES = 3;

// Responsables de una tarea: hasta tres avatares superpuestos y, al lado, el nombre
// (si son varios: "Nombre y N más"; el detalle completo queda en el title).
const ResponsablesTarea = ({ responsables = [], tamano = 22 }) => {
  if (responsables.length === 0) {
    return (
      <span className="org-tarjeta__responsable">
        <AvatarUsuario tamano={tamano} />
        <span>Sin asignar</span>
      </span>
    );
  }

  const visibles = responsables.slice(0, MAXIMO_AVATARES);
  const resto = responsables.length - visibles.length;
  const texto =
    responsables.length === 1 ? responsables[0].nombre_usuario : `${responsables[0].nombre_usuario} y ${responsables.length - 1} más`;

  return (
    <span className="org-tarjeta__responsable">
      <span className="org-avatares">
        {visibles.map((responsable) => (
          <AvatarUsuario key={responsable.id_usuario} nombre={responsable.nombre_usuario} tamano={tamano} />
        ))}
        {resto > 0 && <span className="org-avatares__mas">+{resto}</span>}
      </span>
      <span title={nombresDeResponsables(responsables)}>{texto}</span>
    </span>
  );
};

export default ResponsablesTarea;
