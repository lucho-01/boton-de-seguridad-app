/**
 * Reglas puras del nivel de batería para M9 (spec R1-R6).
 *
 * Sin hardware, red ni SQLite. Todo lo que necesita se pasa por parámetro.
 */

/** Límite inferior del porcentaje de batería. */
export const LIMITE_BATERIA_MIN = 0;

/** Límite superior del porcentaje de batería. */
export const LIMITE_BATERIA_MAX = 100;

/** Resultado de validar el porcentaje de batería. */
export interface ResultadoValidacionBateria {
  valido: boolean;
  error?: string;
}

/**
 * Devuelve `true` si el porcentaje está entre 0 y 100 inclusive.
 */
export function esBateriaValida(porcentaje: number): boolean {
  return porcentaje >= LIMITE_BATERIA_MIN && porcentaje <= LIMITE_BATERIA_MAX;
}

/**
 * Valida que el porcentaje de batería esté dentro del rango permitido.
 */
export function validarBateria(porcentaje: number): ResultadoValidacionBateria {
  if (!esBateriaValida(porcentaje)) {
    return { valido: false, error: "El porcentaje de batería debe estar entre 0 y 100" };
  }
  return { valido: true };
}

/**
 * Devuelve el porcentaje formateado como número entero seguido del signo
 * por ciento (ej: "84%"). No corta nunca el valor.
 */
export function formatearBateria(porcentaje: number): string {
  const entero = Math.round(porcentaje);
  return `${entero}%`;
}
