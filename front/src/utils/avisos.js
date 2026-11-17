import Swal from "../common/alerta";

// Mensaje que manda el back ({ message }) o uno genérico si no hubo respuesta.
export const mensajeDeError = (error) =>
  error?.response?.data?.message ??
  (error?.response ? "Ups! Hubo un problema, por favor intenta más tarde" : "No se pudo conectar con el servidor");

// Errores por campo de una validación del back ({ errores: { campo: mensaje } }).
export const erroresDeCampo = (error) => error?.response?.data?.errores ?? {};

// Aviso breve de que la acción salió bien (no interrumpe).
export const avisarExito = (titulo) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: titulo,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  });

export const avisarError = (error, titulo = "No se pudo completar la acción") =>
  Swal.fire({ icon: "error", title: titulo, text: typeof error === "string" ? error : mensajeDeError(error) });

// Error al guardar un formulario: si el back marcó campos, alcanza con mostrarlos en su lugar;
// si no (sin permiso, conflicto, sin conexión), se avisa con una alerta.
export const mostrarErrorDeFormulario = (error, setErrores) => {
  const errores = erroresDeCampo(error);
  if (Object.keys(errores).length > 0) setErrores(errores);
  else avisarError(error);
};

export const confirmar = async ({ titulo, texto, botonConfirmar = "Confirmar" }) => {
  const { isConfirmed } = await Swal.fire({
    title: titulo,
    text: texto,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: botonConfirmar,
    cancelButtonText: "Cancelar",
    cancelButtonColor: "var(--cd-text-3)",
  });
  return isConfirmed;
};
