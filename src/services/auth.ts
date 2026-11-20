/**
 * Servicio puro de M1 · validaciones de registro e ingreso (spec R1–R3).
 *
 * No toca hardware, red ni SQLite. Todos los textos de usuario son en
 * español; los identificadores de código están en inglés. El tiempo no
 * interviene aquí, por lo que no hay `new Date()` ni `Date.now()`.
 */

export const LONGITUD_CONTRASENA_MIN = 8;

/** Textos de error que muestra la vista (no inventar otro mensaje). */
export const ERROR_CORREO_INVALIDO = "Escribe un correo válido.";
export const ERROR_CONTRASENA_CORTA = "La contraseña debe tener al menos 8 caracteres.";
export const ERROR_CAMPOS_VACIOS = "Escribe el correo y la contraseña.";
export const ERROR_SIN_RED = "No hay conexión a internet. Intenta de nuevo.";
export const ERROR_SERVIDOR = "Error interno. Intenta de nuevo.";

/** Correo repetido (409): se muestra junto al campo correo. */
export const ERROR_CORREO_REPETIDO = "Ese correo ya está registrado.";
/** Credenciales inválidas (401): mensaje genérico, no revela si el correo existe. */
export const ERROR_CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

/** Resultado de validación pura. */
export interface ResultadoValidacionAuth {
  ok: boolean;
  error?: string;
}

/** Valida datos de registro: correo con formato y contraseña ≥ 8 caracteres. */
export function validarRegistro(email: string, password: string): ResultadoValidacionAuth {
  if (!email || !esCorreoValido(email)) {
    return { ok: false, error: ERROR_CORREO_INVALIDO };
  }
  if (!password || password.length < LONGITUD_CONTRASENA_MIN) {
    return { ok: false, error: ERROR_CONTRASENA_CORTA };
  }
  return { ok: true };
}

/** Valida datos de ingreso: ambos campos no vacíos. */
export function validarIngreso(email: string, password: string): ResultadoValidacionAuth {
  if (!email || !password) {
    return { ok: false, error: ERROR_CAMPOS_VACIOS };
  }
  return { ok: true };
}

/** Verifica que el correo tenga formato válido (contiene @ y dominio). */
function esCorreoValido(correo: string): boolean {
  const indiceArroba = correo.indexOf("@");
  if (indiceArroba <= 0 || indiceArroba === correo.length - 1) {
    return false;
  }
  const dominio = correo.slice(indiceArroba + 1);
  return dominio.includes(".");
}
