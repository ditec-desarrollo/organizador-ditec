import { consultar, TABLA_PERSONA } from "../config/dbOrganizador.js";
import { limite } from "./visibilidad.js";
import { nombreCompleto } from "./usuariosRepository.js";
import { RESULTADOS_COMMIT_PENDIENTES } from "../utils/constantes.js";

const marcas = (lista) => lista.map(() => "?").join(", ");

// ───────────── Repositorios de un proyecto ─────────────

export const listarRepositorios = (id_proyecto, connection) =>
  consultar(
    `SELECT id_proyecto_repositorio, repositorio, fecha_alta
     FROM proyecto_repositorio
     WHERE id_proyecto = ? AND habilita = 1
     ORDER BY repositorio`,
    [id_proyecto],
    connection,
  );

// El vínculo de ese repositorio, esté habilitado o no (la clave única es el repositorio).
export const buscarRepositorio = async (repositorio, connection) => {
  const filas = await consultar(
    `SELECT pr.id_proyecto_repositorio, pr.id_proyecto, pr.habilita, p.nombre_proyecto
     FROM proyecto_repositorio pr
     INNER JOIN proyecto p ON p.id_proyecto = pr.id_proyecto
     WHERE pr.repositorio = ?
     LIMIT 1`,
    [repositorio],
    connection,
  );
  return filas[0] ?? null;
};

// Si el repositorio ya había estado vinculado (a este proyecto o a otro) y se lo quitó, se reutiliza la fila.
export const vincularRepositorio = (id_proyecto, repositorio, id_usuario_alta, connection) =>
  consultar(
    `INSERT INTO proyecto_repositorio (id_proyecto, repositorio, id_usuario_alta)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id_proyecto = ?, id_usuario_alta = ?, habilita = 1`,
    [id_proyecto, repositorio, id_usuario_alta, id_proyecto, id_usuario_alta],
    connection,
  );

export const obtenerRepositorio = async (id_proyecto, id_proyecto_repositorio, connection) => {
  const filas = await consultar(
    `SELECT id_proyecto_repositorio, repositorio
     FROM proyecto_repositorio
     WHERE id_proyecto_repositorio = ? AND id_proyecto = ? AND habilita = 1
     LIMIT 1`,
    [id_proyecto_repositorio, id_proyecto],
    connection,
  );
  return filas[0] ?? null;
};

export const desvincularRepositorio = (id_proyecto_repositorio, connection) =>
  consultar("UPDATE proyecto_repositorio SET habilita = 0 WHERE id_proyecto_repositorio = ?", [id_proyecto_repositorio], connection);

// A qué proyecto va un commit. `candidatos` va en orden de preferencia: la URL del remoto y,
// si no está vinculada, el nombre de la carpeta. Devuelve el id_proyecto o null.
export const proyectoDeRepositorio = async (candidatos, connection) => {
  const lista = [...new Set(candidatos.filter(Boolean))];
  if (lista.length === 0) return null;
  const filas = await consultar(
    `SELECT repositorio, id_proyecto FROM proyecto_repositorio WHERE habilita = 1 AND repositorio IN (${marcas(lista)})`,
    lista,
    connection,
  );
  const elegido = lista.map((candidato) => filas.find((fila) => fila.repositorio === candidato)).find(Boolean) ?? filas[0];
  return elegido?.id_proyecto ?? null;
};

// ───────────── Identidades de git de un usuario ─────────────

export const listarAlias = (id_usuario, connection) =>
  consultar(
    `SELECT id_usuario_alias_git, alias, fecha_alta
     FROM usuario_alias_git
     WHERE id_usuario = ? AND habilita = 1
     ORDER BY alias`,
    [id_usuario],
    connection,
  );

// De quién es ese alias, esté habilitado o no (la clave única es el alias).
export const buscarAlias = async (alias, connection) => {
  const filas = await consultar(
    `SELECT a.id_usuario_alias_git, a.id_usuario, a.habilita, ${nombreCompleto("p")} AS nombre_usuario
     FROM usuario_alias_git a
     INNER JOIN usuario u ON u.id_usuario = a.id_usuario
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     WHERE a.alias = ?
     LIMIT 1`,
    [alias],
    connection,
  );
  return filas[0] ?? null;
};

export const guardarAlias = (id_usuario, alias, id_usuario_alta, connection) =>
  consultar(
    `INSERT INTO usuario_alias_git (id_usuario, alias, id_usuario_alta)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id_usuario = ?, id_usuario_alta = ?, habilita = 1`,
    [id_usuario, alias, id_usuario_alta, id_usuario, id_usuario_alta],
    connection,
  );

export const obtenerAlias = async (id_usuario, id_usuario_alias_git, connection) => {
  const filas = await consultar(
    `SELECT id_usuario_alias_git, alias
     FROM usuario_alias_git
     WHERE id_usuario_alias_git = ? AND id_usuario = ? AND habilita = 1
     LIMIT 1`,
    [id_usuario_alias_git, id_usuario],
    connection,
  );
  return filas[0] ?? null;
};

export const quitarAlias = (id_usuario_alias_git, connection) =>
  consultar("UPDATE usuario_alias_git SET habilita = 0 WHERE id_usuario_alias_git = ?", [id_usuario_alias_git], connection);

// Usuario habilitado que firma con alguno de los `candidatos` (en orden de preferencia). Devuelve el id_usuario o null.
export const usuarioDeAlias = async (candidatos, connection) => {
  if (candidatos.length === 0) return null;
  const filas = await consultar(
    `SELECT a.alias, a.id_usuario
     FROM usuario_alias_git a
     INNER JOIN usuario u ON u.id_usuario = a.id_usuario AND u.habilita = 1
     WHERE a.habilita = 1 AND a.alias IN (${marcas(candidatos)})`,
    candidatos,
    connection,
  );
  const elegido = candidatos.map((candidato) => filas.find((fila) => fila.alias === candidato)).find(Boolean) ?? filas[0];
  return elegido?.id_usuario ?? null;
};

// Usuario habilitado cuyo email de Ciudad Digital es ese: así quien firma sus commits con ese email
// no necesita cargar un alias. Solo vale si es uno solo: ante la duda, no se le asigna a nadie.
export const usuarioDeEmail = async (email, connection) => {
  const filas = await consultar(
    `SELECT u.id_usuario
     FROM usuario u
     INNER JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     WHERE u.habilita = 1 AND CONVERT(p.email_persona USING utf8mb4) COLLATE utf8mb4_general_ci = ?
     LIMIT 2`,
    [email],
    connection,
  );
  return filas.length === 1 ? filas[0].id_usuario : null;
};

// ───────────── Commits recibidos ─────────────

const COLUMNAS_COMMIT = `
  c.id_commit_recibido, c.commit_sha, c.repositorio, c.carpeta, c.rama,
  c.autor_nombre, c.autor_email, c.autor_alias, c.mensaje, c.fecha_commit,
  c.resultado, c.id_proyecto, c.id_usuario, c.id_tarea, c.fecha_alta`;

// Anota el commit si es la primera vez que llega; si ya estaba, no cambia nada.
// Dentro de una transacción, además frena a otro pedido con el mismo commit hasta que este termine.
export const registrarCommit = (commit, connection) =>
  consultar(
    `INSERT INTO commit_recibido
       (commit_sha, repositorio, carpeta, rama, autor_nombre, autor_email, autor_alias, mensaje, fecha_commit, resultado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id_commit_recibido = id_commit_recibido`,
    [
      commit.commit_sha,
      commit.repositorio,
      commit.carpeta,
      commit.rama,
      commit.autor_nombre,
      commit.autor_email,
      commit.autor_alias,
      commit.mensaje,
      commit.fecha_commit,
      commit.resultado,
    ],
    connection,
  );

// Lee el commit y lo bloquea hasta el fin de la transacción, para que no se procese dos veces a la vez.
export const obtenerCommitParaProcesar = async (commit_sha, connection) => {
  const filas = await consultar(
    `SELECT ${COLUMNAS_COMMIT} FROM commit_recibido c WHERE c.commit_sha = ? FOR UPDATE`,
    [commit_sha],
    connection,
  );
  return filas[0] ?? null;
};

export const guardarResultado = (id_commit_recibido, { resultado, id_proyecto, id_usuario, id_tarea }, connection) =>
  consultar(
    "UPDATE commit_recibido SET resultado = ?, id_proyecto = ?, id_usuario = ?, id_tarea = ? WHERE id_commit_recibido = ?",
    [resultado, id_proyecto ?? null, id_usuario ?? null, id_tarea ?? null, id_commit_recibido],
    connection,
  );

// Los que esperan que se vincule su repositorio o su autor, del más viejo al más nuevo.
export const shasPendientes = async () => {
  const filas = await consultar(
    `SELECT commit_sha FROM commit_recibido
     WHERE resultado IN (${marcas(RESULTADOS_COMMIT_PENDIENTES)})
     ORDER BY id_commit_recibido
     LIMIT 500`,
    RESULTADOS_COMMIT_PENDIENTES,
  );
  return filas.map((fila) => fila.commit_sha);
};

export const listarCommits = ({ solo_pendientes, cantidad } = {}) =>
  consultar(
    `SELECT ${COLUMNAS_COMMIT},
            pr.nombre_proyecto,
            ${nombreCompleto("p")} AS nombre_usuario,
            t.titulo AS titulo_tarea
     FROM commit_recibido c
     LEFT JOIN proyecto pr ON pr.id_proyecto = c.id_proyecto
     LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
     LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
     LEFT JOIN tarea t ON t.id_tarea = c.id_tarea
     ${solo_pendientes ? `WHERE c.resultado IN (${marcas(RESULTADOS_COMMIT_PENDIENTES)})` : ""}
     ORDER BY c.fecha_alta DESC, c.id_commit_recibido DESC
     LIMIT ${limite(cantidad, 50, 200)}`,
    solo_pendientes ? RESULTADOS_COMMIT_PENDIENTES : [],
  );
