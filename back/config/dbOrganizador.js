import mysql from "mysql2/promise";
import { env } from "./env.js";

// Pool único de la base del Organizador (mismo criterio que cidituc-backend: getPool + liberarConexion).
let pool;

export const obtenerPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      connectionLimit: env.db.connectionLimit,
      waitForConnections: true,
      connectTimeout: 10000,
      charset: "utf8mb4",
      // Las fechas vuelven como texto ("YYYY-MM-DD" / "YYYY-MM-DD HH:MM:SS"): sin corrimientos de zona horaria.
      dateStrings: true,
    });
  }
  return pool;
};

export const conectarDBOrganizador = () => obtenerPool().getConnection();

export const liberarConexion = (connection) => {
  if (connection) connection.release();
};

// Consulta parametrizada. Si se pasa `connection` corre dentro de esa transacción.
export const consultar = async (sql, params = [], connection) => {
  const [filas] = await (connection ?? obtenerPool()).execute(sql, params);
  return filas;
};

// Ejecuta `tarea(connection)` dentro de una transacción: confirma si termina bien, revierte si falla.
export const enTransaccion = async (tarea) => {
  const connection = await conectarDBOrganizador();
  try {
    await connection.beginTransaction();
    const resultado = await tarea(connection);
    await connection.commit();
    return resultado;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    liberarConexion(connection);
  }
};

export const cerrarPool = async () => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};

// Tabla de personas de Ciudad Digital (otra base del mismo servidor), lista para usar en un JOIN.
export const TABLA_PERSONA = `\`${env.dbCiuDigital}\`.persona`;

export default conectarDBOrganizador;
