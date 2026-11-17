import { buscarPorPersona } from "../repositories/usuariosRepository.js";
import { noAutorizado } from "../utils/customError.js";
import { ROLES } from "../utils/constantes.js";

// Va siempre después de auth (usa req.id = id_persona del token).
// Deja en req.usuario el usuario del Organizador: { id_usuario, id_persona, id_tusuario, nombre_tusuario }.
// verifyRole() sin roles: cualquier usuario habilitado.
// verifyRole(ROLES.X, ...): solo esos tipos de usuario.
export const verifyRole =
  (...rolesPermitidos) =>
  async (req, res, next) => {
    // Se consulta una sola vez por request aunque haya varios verifyRole encadenados
    if (req.usuario === undefined) {
      const usuario = await buscarPorPersona(req.id);
      req.usuario = usuario && usuario.habilita === 1 ? usuario : null;
    }

    const autorizado =
      req.usuario !== null &&
      (rolesPermitidos.length === 0 || rolesPermitidos.includes(Number(req.usuario.id_tusuario)));

    if (!autorizado) throw noAutorizado();
    next();
  };

export const usuarioHabilitado = verifyRole();
export const soloAdmin = verifyRole(ROLES.ADMINISTRADOR);
export const soloGestores = verifyRole(ROLES.ADMINISTRADOR, ROLES.SUPERVISOR);

export default verifyRole;
