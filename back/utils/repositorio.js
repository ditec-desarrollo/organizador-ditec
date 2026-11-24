// Forma única de escribir un repositorio, para poder comparar lo que manda git con lo que
// se cargó en el proyecto sin que importe el protocolo, el ".git" o las mayúsculas:
//
//   https://github.com/ditec-desarrollo/GAF-Backend.git  ┐
//   git@github.com:ditec-desarrollo/gaf-backend.git      ├─►  github.com/ditec-desarrollo/gaf-backend
//   ssh://git@github.com/ditec-desarrollo/gaf-backend/   ┘
//
// Un repo sin remoto se identifica por el nombre de su carpeta ("Derivador" -> "derivador").
// Las credenciales que pueda traer la URL (usuario:token@) se descartan: nunca se guardan.
export const normalizarRepositorio = (texto) => {
  let repo = String(texto ?? "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/");
  if (!repo) return "";

  // Forma corta de ssh: usuario@servidor:organizacion/repo
  const corta = /^[^@/\s]+@([^:/\s]+):(.+)$/.exec(repo);
  if (corta) repo = `${corta[1]}/${corta[2]}`;

  return repo
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "") // protocolo
    .replace(/^[^@/]*@/, "") // credenciales
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
};

// Identidad de git (nombre o email del autor) lista para comparar.
export const normalizarAlias = (texto) =>
  String(texto ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
