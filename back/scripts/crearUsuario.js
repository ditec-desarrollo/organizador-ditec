// Da de alta un usuario del Organizador desde la consola. Sirve para el primer administrador
// (que después carga al resto desde la app) y para los usuarios de prueba.
//
//   npm run usuario:crear -- <CUIL> [ADMINISTRADOR|SUPERVISOR|COLABORADOR]
//
// La persona tiene que existir en Ciudad Digital. Si ya era usuaria, se le actualiza el rol y se la habilita.
import { cerrarPool } from "../config/dbOrganizador.js";
import * as usuariosRepository from "../repositories/usuariosRepository.js";
import { ROLES } from "../utils/constantes.js";

const [documento, rol = "ADMINISTRADOR"] = process.argv.slice(2);

const principal = async () => {
  const id_tusuario = ROLES[rol.toUpperCase()];
  if (!/^\d{11}$/.test(documento ?? "") || !id_tusuario) {
    console.error("Uso: npm run usuario:crear -- <CUIL de 11 números> [ADMINISTRADOR|SUPERVISOR|COLABORADOR]");
    process.exitCode = 1;
    return;
  }

  const persona = await usuariosRepository.buscarPersonaPorDocumento(documento);
  if (!persona) {
    console.error(`No hay ninguna persona con CUIL ${documento} en Ciudad Digital.`);
    process.exitCode = 1;
    return;
  }

  const nombre = `${persona.nombre_persona} ${persona.apellido_persona}`;
  const existente = await usuariosRepository.buscarPorPersona(persona.id_persona);
  if (existente) {
    await usuariosRepository.actualizar(existente.id_usuario, { id_tusuario, habilita: 1 });
    console.log(`${nombre} ya era usuario: quedó habilitado como ${rol.toUpperCase()}.`);
  } else {
    await usuariosRepository.crear({ id_persona: persona.id_persona, id_tusuario, id_usuario_alta: null });
    console.log(`${nombre} fue dado de alta como ${rol.toUpperCase()}.`);
  }
};

principal()
  .catch((error) => {
    console.error("No se pudo crear el usuario:", error.message);
    process.exitCode = 1;
  })
  .finally(cerrarPool);
