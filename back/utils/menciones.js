// De una lista de usuarios candidatos ({ id_usuario, nombre_usuario }), deja solo los que
// figuran de verdad en el texto como "@Nombre Apellido" (sin distinguir mayúsculas).
// Así no se puede notificar ni sumar a un proyecto a alguien mandando su id
// sin que la mención se vea en el comentario.
export const mencionadosEnTexto = (comentario, usuarios) => {
  const texto = comentario.toLowerCase();
  return usuarios.filter((usuario) => {
    const nombre = usuario.nombre_usuario?.trim().toLowerCase();
    return Boolean(nombre) && texto.includes(`@${nombre}`);
  });
};

export default mencionadosEnTexto;
