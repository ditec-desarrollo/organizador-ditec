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
  // Cuántos días después de finalizada una tarea sigue apareciendo en el tablero.
  diasFinalizadasEnTablero: entero("DIAS_FINALIZADAS_EN_TABLERO", 7),
  // Rutas de la clave y el certificado. Si están las dos, el back sirve HTTPS (producción); si no, HTTP.
  https: {
    key: opcional("HTTPS_KEY"),
    cert: opcional("HTTPS_CERT"),
  },
  // Aviso por email a quien etiquetan en un comentario. Sale por la misma cuenta que usa el back
  // de Ciudad Digital (Gmail). Apagado por defecto: en desarrollo no sale ningún mail.
  email: {
    activo: opcional("EMAIL_ACTIVO").toLowerCase() === "true",
    usuario: opcional("EMAIL_USUARIO", "no-reply-cdigital@smt.gob.ar"),
    password: opcional("PASSWORD_MAIL"),
    remitente: opcional("EMAIL_REMITENTE", "SMT-Organizador"),
  },
  // Dirección pública del front, para el botón del mail. Vacía = el mail sale sin botón.
  urlFront: opcional("URL_FRONT").replace(/\/+$/, ""),
  // Clave que manda el hook de Claude Code en cada commit (POST /integraciones/commits).
  // Vacía = la integración está apagada y esa ruta responde 503.
  integracionApiKey: opcional("INTEGRACION_API_KEY"),
};

// Esa ruta no pide token de Ciudad Digital: la clave es lo único que la protege.
if (env.integracionApiKey && env.integracionApiKey.length < 32) {
  throw new Error("INTEGRACION_API_KEY tiene que tener al menos 32 caracteres (ver .env.example)");
}

if (env.email.activo && !env.email.password) {
  throw new Error("EMAIL_ACTIVO está en true pero falta PASSWORD_MAIL (ver .env.example)");
}

export default env;
