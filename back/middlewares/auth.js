import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Mismo middleware que Movilidad-Urbana-Back: el login lo hace Ciudad Digital y acá solo
// se verifica el token que emite (payload { id: id_persona }).
// El front lo manda tal cual en Authorization (sin "Bearer"); se acepta también con el prefijo.
export const leerToken = (req) => {
  const header = req.header("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : header;
};

export const auth = (req, res, next) => {
  try {
    const { id } = jwt.verify(leerToken(req), env.jwtSecretKey);
    if (!id) throw new Error("Token sin id");
    req.id = id; // id_persona de Ciudad Digital
    next();
  } catch {
    // El front (config/axios.js) busca exactamente este mensaje para cerrar la sesión.
    res.status(401).json({ message: "Invalid token" });
  }
};

export default auth;
