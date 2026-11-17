import { consultar, TABLA_PERSONA } from "../config/dbOrganizador.js";

// Usuario del Organizador + datos de la persona en Ciudad Digital.
const SELECT_USUARIO = `
  SELECT
    u.id_usuario,
    u.id_persona,
    u.id_tusuario,
    tu.nombre_tusuario,
    u.habilita,
    u.fecha_alta,
    p.documento_persona,
    p.nombre_persona,
    p.apellido_persona,
    p.email_persona
  FROM usuario u
  INNER JOIN tipo_usuario tu ON tu.id_tusuario = u.id_tusuario
  LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona`;

// Nombre para mostrar de un usuario, para usar en los JOIN de otros repositorios:
//   LEFT JOIN usuario u ON … LEFT JOIN ${TABLA_PERSONA} p ON p.id_persona = u.id_persona
export const nombreCompleto = (alias) =>
  `TRIM(CONCAT(COALESCE(${alias}.nombre_persona, ''), ' ', COALESCE(${alias}.apellido_persona, '')))`;

export const buscarPorPersona = async (id_persona, connection) => {
  const filas = await consultar(
    `SELECT u.id_usuario, u.id_persona, u.id_tusuario, tu.nombre_tusuario, u.habilita
     FROM usuario u
     INNER JOIN tipo_usuario tu ON tu.id_tusuario = u.id_tusuario
     WHERE u.id_persona = ?
     LIMIT 1`,
    [id_persona],
    connection,
  );
  return filas[0] ?? null;
};

export const obtenerPersona = async (id_persona) => {
  const filas = await consultar(
    `SELECT id_persona, documento_persona, nombre_persona, apellido_persona, email_persona
     FROM ${TABLA_PERSONA}
     WHERE id_persona = ?
     LIMIT 1`,
    [id_persona],
  );
  return filas[0] ?? null;
};

export const buscarPersonaPorDocumento = async (documento) => {
  const filas = await consultar(
    `SELECT id_persona, documento_persona, nombre_persona, apellido_persona, email_persona
     FROM ${TABLA_PERSONA}
     WHERE documento_persona = ?
     LIMIT 1`,
    [documento],
  );
  return filas[0] ?? null;
};

export const listar = ({ soloHabilitados = false } = {}) =>
  consultar(
    `${SELECT_USUARIO}
     ${soloHabilitados ? "WHERE u.habilita = 1" : ""}
     ORDER BY p.apellido_persona, p.nombre_persona, u.id_usuario`,
  );

export const obtener = async (id_usuario, connection) => {
  const filas = await consultar(`${SELECT_USUARIO} WHERE u.id_usuario = ? LIMIT 1`, [id_usuario], connection);
  return filas[0] ?? null;
};

export const crear = async ({ id_persona, id_tusuario, id_usuario_alta }, connection) => {
  const resultado = await consultar(
    "INSERT INTO usuario (id_persona, id_tusuario, id_usuario_alta) VALUES (?, ?, ?)",
    [id_persona, id_tusuario, id_usuario_alta ?? null],
    connection,
  );
  return resultado.insertId;
};

export const actualizar = (id_usuario, { id_tusuario, habilita }, connection) =>
  consultar("UPDATE usuario SET id_tusuario = ?, habilita = ? WHERE id_usuario = ?", [id_tusuario, habilita, id_usuario], connection);

export const contarAdministradoresHabilitados = async (id_tusuario_admin, connection) => {
  const filas = await consultar(
    "SELECT COUNT(*) AS total FROM usuario WHERE id_tusuario = ? AND habilita = 1",
    [id_tusuario_admin],
    connection,
  );
  return filas[0].total;
};
