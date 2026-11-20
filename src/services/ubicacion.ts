/**
 * Reglas puras de validación de coordenadas para M8.
 *
 * Sin hardware, red ni SQLite. Todo lo que necesita se pasa por parámetro.
 */

const LATITUD_MIN = -90;
const LATITUD_MAX = 90;
const LONGITUD_MIN = -180;
const LONGITUD_MAX = 180;

export interface ResultadoValidacionCoordenadas {
  valido: boolean;
  error?: string;
}

/**
 * Devuelve `true` si latitud está en [-90, 90] y longitud en [-180, 180].
 */
export function esCoordenadaValida(lat: number, lng: number): boolean {
  return lat >= LATITUD_MIN && lat <= LATITUD_MAX && lng >= LONGITUD_MIN && lng <= LONGITUD_MAX;
}

/**
 * Valida latitud, longitud y precisión (si se entrega).
 * La precisión debe ser mayor o igual a cero cuando existe.
 */
export function validarCoordenadas(
  lat: number,
  lng: number,
  precision?: number,
): ResultadoValidacionCoordenadas {
  if (!esCoordenadaValida(lat, lng)) {
    return { valido: false, error: "Coordenadas fuera de rango" };
  }
  if (precision !== undefined && precision < 0) {
    return { valido: false, error: "La precisión no puede ser negativa" };
  }
  return { valido: true };
}
