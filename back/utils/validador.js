import { datosInvalidos } from "./customError.js";

const vacio = (valor) => valor === undefined || valor === null || (typeof valor === "string" && valor.trim() === "");

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export const esFechaValida = (texto) => {
  const partes = FECHA.exec(texto);
  if (!partes) return false;
  const [, anio, mes, dia] = partes.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
};

// Lee y valida los campos de un body o un query. Cada método devuelve el valor ya limpio
// (o null si el campo es opcional y no vino) y va juntando los errores por campo;
// verificar() corta con un 400 si hubo alguno.
//
//   const v = new Validador(req.body);
//   const datos = { titulo: v.texto("titulo", { requerido: true, max: 200 }) };
//   v.verificar();
export class Validador {
  constructor(datos) {
    this.datos = datos && typeof datos === "object" ? datos : {};
    this.errores = {};
  }

  // true si el campo vino en la petición (aunque sea vacío): sirve para actualizaciones parciales.
  vino(campo) {
    return this.datos[campo] !== undefined;
  }

  error(campo, mensaje) {
    if (!this.errores[campo]) this.errores[campo] = mensaje;
    return null;
  }

  texto(campo, { requerido = false, min = 1, max = 255 } = {}) {
    const valor = this.datos[campo];
    if (vacio(valor)) return requerido ? this.error(campo, "Este dato es obligatorio") : null;
    if (typeof valor !== "string") return this.error(campo, "Tiene que ser un texto");
    const limpio = valor.trim();
    if (limpio.length < min) return this.error(campo, `Tiene que tener al menos ${min} caracteres`);
    if (limpio.length > max) return this.error(campo, `No puede superar los ${max} caracteres`);
    return limpio;
  }

  entero(campo, { requerido = false, min = 1, max = 2147483647 } = {}) {
    const valor = this.datos[campo];
    if (vacio(valor)) return requerido ? this.error(campo, "Este dato es obligatorio") : null;
    const numero = typeof valor === "number" ? valor : /^-?\d+$/.test(String(valor).trim()) ? Number(valor) : NaN;
    if (!Number.isInteger(numero)) return this.error(campo, "Tiene que ser un número entero");
    if (numero < min || numero > max) return this.error(campo, `Tiene que estar entre ${min} y ${max}`);
    return numero;
  }

  // Entero que además tiene que ser uno de los valores permitidos (ids de un catálogo).
  opcion(campo, permitidos, opciones = {}) {
    const numero = this.entero(campo, opciones);
    if (numero === null) return null;
    if (!permitidos.includes(numero)) return this.error(campo, "El valor elegido no es válido");
    return numero;
  }

  fecha(campo, { requerido = false } = {}) {
    const valor = this.datos[campo];
    if (vacio(valor)) return requerido ? this.error(campo, "Este dato es obligatorio") : null;
    // Acepta "AAAA-MM-DD" y también una fecha con hora (se queda con el día).
    const texto = String(valor).trim().slice(0, 10);
    if (!esFechaValida(texto)) return this.error(campo, "La fecha no es válida (AAAA-MM-DD)");
    return texto;
  }

  // 1/0, true/false, "1"/"0", "true"/"false" -> 1 o 0
  booleano(campo, { requerido = false } = {}) {
    const valor = this.datos[campo];
    if (vacio(valor)) return requerido ? this.error(campo, "Este dato es obligatorio") : null;
    if (valor === true || valor === 1 || valor === "1" || valor === "true") return 1;
    if (valor === false || valor === 0 || valor === "0" || valor === "false") return 0;
    return this.error(campo, "Tiene que ser verdadero o falso");
  }

  listaDeEnteros(campo, { max = 500 } = {}) {
    const valor = this.datos[campo];
    if (vacio(valor)) return null;
    if (!Array.isArray(valor) || valor.length > max) return this.error(campo, "La lista no es válida");
    const numeros = valor.map(Number);
    if (numeros.some((numero) => !Number.isInteger(numero) || numero < 1)) {
      return this.error(campo, "La lista no es válida");
    }
    return [...new Set(numeros)];
  }

  verificar() {
    if (Object.keys(this.errores).length > 0) throw datosInvalidos(this.errores);
  }
}

// Id que viene en la URL (/tareas/:id_tarea).
export const idDeRuta = (valor, nombre = "id") => {
  const v = new Validador({ [nombre]: valor });
  const id = v.entero(nombre, { requerido: true });
  v.verificar();
  return id;
};

export default Validador;
