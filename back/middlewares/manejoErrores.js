import CustomError from "../utils/customError.js";

export const rutaNoEncontrada = (req, res) => {
  res.status(404).json({ message: "La ruta no existe" });
};

// Único lugar donde se arma la respuesta de error. Express 5 trae hasta acá cualquier
// error de un controller async, así que los controllers no necesitan try/catch.
// Formato de la casa: { message } (+ `errores` por campo cuando es una validación).
// eslint-disable-next-line no-unused-vars
export const manejoErrores = (error, req, res, next) => {
  if (error instanceof CustomError) {
    return res.status(error.code).json({ message: error.message, errores: error.errores });
  }

  // Body con JSON mal formado o demasiado grande (los genera express.json)
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "El cuerpo de la petición no es un JSON válido" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "La petición es demasiado grande" });
  }

  // Errores de MySQL: error.code es un texto ("ER_DUP_ENTRY"), no un código HTTP.
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "Ese registro ya existe" });
  }
  if (["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST"].includes(error.code)) {
    console.error("ERROR de conexión con la base:", error.message);
    return res.status(503).json({ message: "No se pudo conectar con la base de datos" });
  }

  // Cualquier otra cosa es un error nuestro: se registra completo y no se le muestra el detalle al cliente.
  console.error(`ERROR ${req.method} ${req.originalUrl}:`, error);
  res.status(500).json({ message: "Ups! Hubo un problema, por favor intenta más tarde" });
};

export default manejoErrores;
