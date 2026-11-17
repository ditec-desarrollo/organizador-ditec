import { esAdmin } from "../utils/constantes.js";

// Qué proyectos puede ver un usuario: el administrador todos; el resto, solo aquellos
// en los que es integrante. Devuelve un fragmento de WHERE y sus parámetros.
// `alias` es el alias de la tabla que tiene la columna id_proyecto (proyecto, tarea, registro_actividad…).
export const filtroProyectosVisibles = (usuario, alias) =>
  esAdmin(usuario)
    ? { sql: "1 = 1", params: [] }
    : {
        sql: `EXISTS (
          SELECT 1 FROM proyecto_integrante pi_v
          WHERE pi_v.id_proyecto = ${alias}.id_proyecto AND pi_v.id_usuario = ? AND pi_v.habilita = 1
        )`,
        params: [usuario.id_usuario],
      };

// LIMIT no admite parámetros preparados en todas las versiones de MySQL:
// se interpola un entero ya acotado, nunca un valor crudo de la petición.
export const limite = (valor, porDefecto = 50, maximo = 500) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? Math.min(numero, maximo) : porDefecto;
};
