import { Outlet, useNavigate } from "react-router-dom";
import NavBar from "../common/NavBar";
import CampanaNotificaciones from "../components/notificaciones/CampanaNotificaciones";
import DetalleTarea from "../components/tareas/DetalleTarea";
import { useDatos, useUsuario } from "../context/contextos";

// Adaptación de UX-UI/plantillas/ciudad-digital/src/common/Layout.jsx al contexto de esta app.
// Además del header, monta el detalle de tarea: así se puede abrir desde cualquier pantalla (?tarea=<id>).
const LayoutPrincipal = () => {
  const { usuario, autenticado, cargando, tieneAcceso, nombreCompleto, cerrarSesion } = useUsuario();
  const { idTareaAbierta, solapaTareaAbierta, cerrarTarea } = useDatos();
  const navigate = useNavigate();

  return (
    <>
      <NavBar
        autenticado={autenticado}
        cargando={cargando}
        nombreUsuario={nombreCompleto}
        sesion={{ usuario }}
        acciones={tieneAcceso ? <CampanaNotificaciones onVerTodas={() => navigate("/notificaciones")} /> : null}
        onCerrarSesion={cerrarSesion}
      />
      <Outlet />
      {tieneAcceso && idTareaAbierta && (
        // La solapa entra en la key: si con una tarea abierta llega una notificación de esa misma tarea,
        // el detalle se vuelve a montar y muestra los comentarios.
        <DetalleTarea
          key={`${idTareaAbierta}-${solapaTareaAbierta ?? ""}`}
          idTarea={idTareaAbierta}
          solapaInicial={solapaTareaAbierta}
          onCerrar={cerrarTarea}
        />
      )}
    </>
  );
};

export default LayoutPrincipal;
