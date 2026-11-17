import dotenv from "dotenv";

dotenv.config({ quiet: true });

// Único lugar donde se lee process.env: si falta algo obligatorio el back no arranca,
// en vez de fallar más tarde con un error confuso.
const requerida = (nombre) => {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example)`);
  return valor;
};

const opcional = (nombre, porDefecto = "") => process.env[nombre]?.trim() || porDefecto;

const entero = (nombre, porDefecto) => {
  const valor = Number.parseInt(opcional(nombre), 10);
  return Number.isInteger(valor) ? valor : porDefecto;
};

// El nombre de la base de Ciudad Digital se interpola en el SQL (JOIN entre bases),
// así que solo se aceptan letras, números y guion bajo.
const nombreDeBase = (nombre, porDefecto) => {
  const valor = opcional(nombre, porDefecto);
  if (!/^[A-Za-z0-9_]+$/.test(valor)) throw new Error(`${nombre} no es un nombre de base válido`);
  return valor;
};

export const env = {
  puerto: entero("PORT", 4010),
  jwtSecretKey: requerida("JWT_SECRET_KEY"),
  db: {
    host: requerida("HOST_ORGANIZADOR"),
    port: entero("PORT_ORGANIZADOR", 3306),
    user: requerida("USER_ORGANIZADOR"),
    password: opcional("PASSWORD_ORGANIZADOR"),
    database: requerida("DB_ORGANIZADOR"),
    connectionLimit: entero("DB_LIMITE_CONEXIONES", 10),
  },
  dbCiuDigital: nombreDeBase("DB_CIU_DIGITAL", "ciudadano_digital"),
  corsOrigenes: opcional("CORS_ORIGENES")
    .split(",")
    .map((origen) => origen.trim())
    .filter(Boolean),
  diasAvisoVencimiento: entero("DIAS_AVISO_VENCIMIENTO", 2),
};

export default env;
