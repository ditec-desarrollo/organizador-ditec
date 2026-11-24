import { Validador } from "../utils/validador.js";
import { fechaHoraLocal } from "../utils/commits.js";
import { normalizarAlias, normalizarRepositorio } from "../utils/repositorio.js";

const SHA = /^[0-9a-f]{40}$/;
// Como la escribe git con %cI: "2026-11-24T10:15:30-03:00".
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const MAX_REPOSITORIO = 190; // proyecto_repositorio.repositorio
const MAX_ALIAS = 190; // usuario_alias_git.alias

// Repositorio ya normalizado, o error en `campo`.
const repositorioValido = (v, campo, { requerido }) => {
  const texto = v.texto(campo, { requerido, max: 500 });
  if (texto === null) return null;
  const repositorio = normalizarRepositorio(texto);
  if (repositorio.length < 2) return v.error(campo, "No es un repositorio válido");
  if (repositorio.length > MAX_REPOSITORIO) return v.error(campo, `No puede superar los ${MAX_REPOSITORIO} caracteres`);
  return repositorio;
};

// Lo que manda el hook por cada commit.
export const datosCommit = (body) => {
  const v = new Validador(body);
  const datos = {
    commit_sha: v.texto("commit_sha", { requerido: true, max: 40 })?.toLowerCase() ?? null,
    repositorio: repositorioValido(v, "repositorio", { requerido: true }),
    carpeta: v.texto("carpeta", { max: 190 })?.toLowerCase() ?? null,
    rama: v.texto("rama", { max: 190 }),
    autor_nombre: v.texto("autor_nombre", { max: 190 }),
    autor_email: v.texto("autor_email", { max: 190 }),
    autor_alias: v.texto("autor_alias", { max: 190 }),
    // commit_recibido.mensaje es TEXT (65.535 bytes): 10.000 caracteres entran aunque sean todos de 4 bytes.
    mensaje: v.texto("mensaje", { requerido: true, max: 10000 }),
    fecha_commit: v.texto("fecha", { max: 40 }),
    es_merge: v.booleano("es_merge") ?? 0,
  };
  if (datos.commit_sha && !SHA.test(datos.commit_sha)) v.error("commit_sha", "Tiene que ser el hash completo del commit (40 caracteres)");
  if (datos.fecha_commit && !FECHA_ISO.test(datos.fecha_commit)) v.error("fecha", "La fecha no es válida (ISO 8601)");
  v.verificar();
  return { ...datos, fecha_commit: fechaHoraLocal(datos.fecha_commit) };
};

export const datosRepositorio = (body) => {
  const v = new Validador(body);
  const repositorio = repositorioValido(v, "repositorio", { requerido: true });
  v.verificar();
  return repositorio;
};

export const datosAlias = (body) => {
  const v = new Validador(body);
  const texto = v.texto("alias", { requerido: true, min: 2, max: MAX_ALIAS });
  v.verificar();
  return normalizarAlias(texto);
};

export const filtrosCommits = (query) => {
  const v = new Validador(query);
  const filtros = {
    solo_pendientes: v.booleano("solo_pendientes"),
    cantidad: v.entero("cantidad", { max: 200 }),
  };
  v.verificar();
  return filtros;
};
