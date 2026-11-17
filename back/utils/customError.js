// Error con código HTTP. Misma firma que el CustomError del resto de los backs
// (message, code), con un tercer dato opcional para el detalle de validación.
class CustomError extends Error {
  constructor(message, code = 500, errores = undefined) {
    super(message);
    this.name = "CustomError";
    this.code = code;
    this.errores = errores;
  }
}

export const datosInvalidos = (errores, message = "Hay datos inválidos o incompletos") =>
  new CustomError(message, 400, errores);
export const noAutorizado = (message = "Usted no está autorizado") => new CustomError(message, 403);
export const noEncontrado = (message = "No se encontró lo que buscabas") => new CustomError(message, 404);
export const conflicto = (message) => new CustomError(message, 409);

export default CustomError;
