// Runner de migraciones.
//   npm run migrar          -> aplica los .sql pendientes de esta carpeta, en orden alfabético
//   npm run migrar:estado   -> muestra cuáles están aplicados y cuáles no (no cambia nada)
//
// Cada archivo se llama AAAA-MM-DD_NNN_descripcion.sql y se aplica una sola vez: queda anotado
// en la tabla `migracion`. Un archivo ya aplicado no se edita; los cambios van en uno nuevo.
// La base (organizador_smt) tiene que existir: este script no la crea.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const CARPETA = path.dirname(fileURLToPath(import.meta.url));
const soloEstado = process.argv.includes("--estado");

const listarArchivos = async () =>
  (await fs.readdir(CARPETA)).filter((archivo) => archivo.endsWith(".sql")).sort();

const principal = async () => {
  // Conexión propia (no el pool): necesita multipleStatements para correr un archivo entero.
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    charset: "utf8mb4",
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS migracion (
         id_migracion     INT           NOT NULL AUTO_INCREMENT,
         archivo          VARCHAR(190)  NOT NULL,
         fecha_ejecucion  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (id_migracion),
         UNIQUE KEY uq_migracion_archivo (archivo)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    const [aplicadas] = await connection.query("SELECT archivo, fecha_ejecucion FROM migracion");
    const fechaPorArchivo = new Map(aplicadas.map((fila) => [fila.archivo, fila.fecha_ejecucion]));
    const archivos = await listarArchivos();
    const pendientes = archivos.filter((archivo) => !fechaPorArchivo.has(archivo));

    console.log(`Base: ${env.db.database} en ${env.db.host}:${env.db.port}`);

    if (soloEstado) {
      for (const archivo of archivos) {
        const fecha = fechaPorArchivo.get(archivo);
        console.log(`${fecha ? "aplicada " : "PENDIENTE"}  ${archivo}`);
      }
      console.log(`${pendientes.length} pendiente(s) de ${archivos.length}.`);
      return;
    }

    if (pendientes.length === 0) {
      console.log("No hay migraciones pendientes.");
      return;
    }

    for (const archivo of pendientes) {
      const sql = await fs.readFile(path.join(CARPETA, archivo), "utf8");
      console.log(`Aplicando ${archivo}…`);
      // MySQL confirma solo cada CREATE/ALTER: si un archivo falla a la mitad, lo anterior queda aplicado.
      // Por eso se corta en el primer error y el archivo no se anota como aplicado.
      await connection.query(sql);
      await connection.query("INSERT INTO migracion (archivo) VALUES (?)", [archivo]);
    }
    console.log(`Listo: ${pendientes.length} migración(es) aplicada(s).`);
  } finally {
    await connection.end();
  }
};

principal().catch((error) => {
  console.error("No se pudo completar la migración:", error.message);
  process.exitCode = 1;
});
