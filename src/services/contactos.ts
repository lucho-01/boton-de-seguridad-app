/**
 * Servicio puro de M4 · validaciones de contactos de confianza (spec R1–R5, R9).
 *
 * No toca hardware, red ni SQLite. El tiempo se inyecta (`ahora: Date`) para
 * poder probar con fecha fija. Todos los textos son en español y son los que
 * muestra la vista; las constantes se exportan para que la vista no invente
 * otro mensaje.
 */

export const LIMITE_CONTACTOS = 5;
export const LONGITUD_NOMBRE_MIN = 1;
export const LONGITUD_NOMBRE_MAX = 40;
export const LONGITUD_PARENTESCO_MAX = 40;
export const LONGITUD_TELEFONO = 10;

/** Textos de error que muestra la vista (no inventar otro mensaje). */
export const ERROR_TELEFONO_INVALIDO = "El teléfono debe tener 10 dígitos.";
export const ERROR_TELEFONO_DUPLICADO = "Ese número ya está entre tus contactos.";
export const ERROR_LIMITE_ALCANZADO = "No puedes tener más de 5 contactos de confianza.";
export const ERROR_NOMBRE_VACIO = "Escribe el nombre del contacto.";
export const ERROR_PARENTESCO_MUY_LARGO = "El parentesco es demasiado largo.";
export const ERROR_ESCRITURA = "No se pudo guardar el contacto. Intenta otra vez.";

/** Texto que avisa al guardar un contacto nuevo. */
export const MENSAJE_GUARDADO = "Contacto guardado.";
/** Texto que avisa al guardar un contacto editado. */
export const MENSAJE_EDITADO = "Contacto actualizado.";
/** Texto que avisa al borrar un contacto (borrado lógico). */
export const MENSAJE_BORRADO = "Contacto eliminado.";

/** Error de un campo del formulario. */
export interface ErrorCampo {
  campo: "nombre" | "telefono" | "parentesco";
  mensaje: string;
}

/** Resultado de `validarContacto`: ya está listo para guardar o hay errores. */
export interface ResultadoValidacion {
  /** `true` cuando los datos pasan todas las reglas. */
  ok: boolean;
  /** Errores por campo; vacío cuando `ok` es `true`. */
  errores: ErrorCampo[];
  /** Datos listos para guardar; presente solo cuando `ok` es `true`. */
  datos?: DatosListos;
}

/** Datos válidos que el repositorio puede guardar. */
export interface ContactoValido {
  nombre: string;
  telefono: string;
  parentesco: string | null;
}

/** Contacto de confianza tal como lo define el modelo (snake_case). */
export interface ContactoConfianza {
  id: string;
  nombre: string;
  telefono: string;
  parentesco: string | null;
  remote_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pending: number;
  deleted: number;
  /** 1 si es el contacto principal, 0 si no. Solo uno a la vez (M5). */
  principal: number;
}

/** Entrada de `validarContacto`: datos del formulario + contexto. */
export interface DatosValidar {
  /** Nombre tal como lo escribió la persona (puede tener espacios de sobra). */
  nombre: string;
  /** Teléfono tal como lo escribió la persona. */
  telefono: string;
  /** Parentesco opcional. */
  parentesco: string;
  /** Contacto que se está editando, si lo hay; se excluye al buscar duplicados. */
  idOriginal: string | null;
  /** Contactos ya guardados (menos el que se edita). */
  existentes: ContactoConfianza[];
  /** Fecha inyectada del controlador. */
  ahora: Date;
  /** Si el contacto es principal (0 o 1). */
  principal: number;
}

/** Valida un contacto de contacto y devuelve los errores o el dato listo. */
export function validarContacto(datos: DatosValidar): ResultadoValidacion {
  const errores: ErrorCampo[] = [];

  if (!datos.nombre || datos.nombre.trim().length < LONGITUD_NOMBRE_MIN) {
    errores.push({ campo: "nombre", mensaje: ERROR_NOMBRE_VACIO });
  }
  if (datos.nombre.trim().length > LONGITUD_NOMBRE_MAX) {
    errores.push({
      campo: "nombre",
      mensaje: `El nombre no puede superar los ${LONGITUD_NOMBRE_MAX} caracteres.`,
    });
  }
  if (!esTelefonoValido(datos.telefono)) {
    errores.push({ campo: "telefono", mensaje: ERROR_TELEFONO_INVALIDO });
  } else if (telefonoYaExiste(datos)) {
    errores.push({ campo: "telefono", mensaje: ERROR_TELEFONO_DUPLICADO });
  }
  if (datos.parentesco.trim().length > LONGITUD_PARENTESCO_MAX) {
    errores.push({ campo: "parentesco", mensaje: ERROR_PARENTESCO_MUY_LARGO });
  }

  const puedeAgregar = datos.idOriginal === null;
  if (puedeAgregar && datos.existentes.length >= LIMITE_CONTACTOS) {
    errores.push({ campo: "telefono", mensaje: ERROR_LIMITE_ALCANZADO });
  }

  if (errores.length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    errores: [],
    datos: {
      nombre: datos.nombre.trim(),
      telefono: datos.telefono,
      parentesco: parentescoOpcional(datos.parentesco),
      principal: datos.principal,
    },
  };
}

/** Devuelve el parentesco recortado, o `null` si está vacío. */
function parentescoOpcional(parentesco: string): string | null {
  const recortado = parentesco.trim();
  if (recortado === "") {
    return null;
  }
  return recortado;
}

/** Verifica que el teléfono tenga exactamente 10 dígitos numéricos. */
function esTelefonoValido(telefono: string): boolean {
  if (telefono.length !== LONGITUD_TELEFONO) {
    return false;
  }
  for (let i = 0; i < telefono.length; i += 1) {
    const codigo = telefono.charCodeAt(i);
    if (codigo < 48 || codigo > 57) {
      return false;
    }
  }
  return true;
}

/** Comprueba si el teléfono ya existe entre los contactos existentes. */
function telefonoYaExiste(datos: DatosValidar): boolean {
  for (let i = 0; i < datos.existentes.length; i += 1) {
    const existente = datos.existentes[i];
    if (datos.idOriginal !== null && existente.id === datos.idOriginal) {
      continue;
    }
    if (existente.telefono === datos.telefono) {
      return true;
    }
  }
  return false;
}

/**
 * Contacto ya listo para guardar: nombre recortado, teléfono de 10 dígitos,
 * parentesco opcional como `null` cuando está vacío.
 */
export interface DatosListos {
  nombre: string;
  telefono: string;
  parentesco: string | null;
  principal: number;
}

/** Convierte un contacto guardado en datos para el formulario (edición). */
export function contactoParaFormulario(contacto: ContactoConfianza): DatosContacto {
  return {
    nombre: contacto.nombre,
    telefono: contacto.telefono,
    parentesco: contacto.parentesco ?? "",
    principal: contacto.principal,
  };
}

/** Indica si el contacto es principal (para mostrar el indicador visual). */
export function esPrincipal(contacto: ContactoConfianza): boolean {
  return contacto.principal === 1;
}

/** Entrada del formulario al guardar. */
export interface DatosContacto {
  nombre: string;
  telefono: string;
  parentesco: string;
  /** 0 para un contacto nuevo; el contacto editado trae su valor actual. */
  principal: number;
}

/** Crea un contacto nuevo en formato de base de datos, con UUID y `pending = 1`. */
export function crearContactoNuevo(datos: DatosListos, ahora: Date): ContactoConfianza {
  return {
    id: generarId(),
    nombre: datos.nombre,
    telefono: datos.telefono,
    parentesco: datos.parentesco,
    remote_id: null,
    created_at: ahora.toISOString(),
    updated_at: ahora.toISOString(),
    deleted_at: null,
    pending: 1,
    deleted: 0,
    principal: 0,
  };
}

/** Devuelve una copia del contacto con los campos de edición actualizados. */
export function actualizarCampos(
  contacto: ContactoConfianza,
  datos: DatosListos,
  ahora: Date,
): ContactoConfianza {
  return {
    ...contacto,
    nombre: datos.nombre,
    telefono: datos.telefono,
    parentesco: datos.parentesco,
    updated_at: ahora.toISOString(),
    pending: 1,
  };
}

/** Marca a un contacto como principal y desmarca a todos los demás (R3, R9). */
export function marcarPrincipal(
  contactos: ContactoConfianza[],
  id: string,
  ahora: Date,
): ContactoConfianza[] {
  return contactos.map((c) => {
    if (c.id === id) {
      return { ...c, principal: 1, updated_at: ahora.toISOString(), pending: 1 };
    }
    if (c.principal === 1) {
      return { ...c, principal: 0, updated_at: ahora.toISOString(), pending: 1 };
    }
    return c;
  });
}

/** Alterna el estado principal de un contacto (toggle con exclusividad, R2 y R3). */
export function togglePrincipal(
  contactos: ContactoConfianza[],
  id: string,
  ahora: Date,
): ContactoConfianza[] {
  const contacto = contactos.find((c) => c.id === id);
  if (contacto === undefined) {
    return contactos;
  }
  if (contacto.principal === 1) {
    return desmarcarPrincipal(contactos, id, ahora);
  }
  return marcarPrincipal(contactos, id, ahora);
}

/** Desmarca el contacto como principal (solo si no es el único principal, R8). */
export function desmarcarPrincipal(
  contactos: ContactoConfianza[],
  id: string,
  ahora: Date,
): ContactoConfianza[] {
  const contacto = contactos.find((c) => c.id === id);
  if (contacto === undefined || contacto.principal !== 1) {
    return contactos;
  }
  const principales = contactos.filter((c) => c.principal === 1);
  if (principales.length <= 1) {
    return contactos;
  }
  return contactos.map((c) => {
    if (c.id === id) {
      return { ...c, principal: 0, updated_at: ahora.toISOString(), pending: 1 };
    }
    return c;
  });
}

/** Devuelve el contacto principal actual, o `null` si no hay ninguno. */
export function obtenerPrincipal(contactos: ContactoConfianza[]): ContactoConfianza | null {
  for (let i = 0; i < contactos.length; i += 1) {
    if (contactos[i].principal === 1) {
      return contactos[i];
    }
  }
  return null;
}

/** Indica si el contacto indicado es el único principal (no se puede desmarcar, R8). */
export function esUnicoPrincipal(contactos: ContactoConfianza[], id: string): boolean {
  const contacto = contactos.find((c) => c.id === id);
  if (contacto === undefined || contacto.principal !== 1) {
    return false;
  }
  const principales = contactos.filter((c) => c.principal === 1);
  return principales.length <= 1;
}

/** Genera un identificador único para el contacto (lo genera la app, R7). */
function generarId(): string {
  const parte1 = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
  const parte2 = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
  const parte3 = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
  const parte4 = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
  const parte5 = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
  const parte6 = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
  return `${parte1}${parte2}-${parte3}-${parte4}-${parte5}-${parte6}`;
}

/** Ordena contactos por nombre, sin distinguir mayúsculas (R8). */
export function ordenarPorNombre(contactos: ContactoConfianza[]): ContactoConfianza[] {
  const copia = [...contactos];
  copia.sort((a, b) => {
    const nombreA = a.nombre.toLowerCase();
    const nombreB = b.nombre.toLowerCase();
    if (nombreA < nombreB) {
      return -1;
    }
    if (nombreA > nombreB) {
      return 1;
    }
    return 0;
  });
  return copia;
}

/** Filtra los contactos no borrados (deleted = 0). */
export function contactosActivos(contactos: ContactoConfianza[]): ContactoConfianza[] {
  const activos: ContactoConfianza[] = [];
  for (let i = 0; i < contactos.length; i += 1) {
    if (contactos[i].deleted === 0) {
      activos.push(contactos[i]);
    }
  }
  return activos;
}
