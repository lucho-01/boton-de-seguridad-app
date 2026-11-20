/**
 * Servicio puro de detección de sacudida triple para M7 (spec R1, R2).
 *
 * Sin hardware, red ni SQLite. El tiempo se inyecta en cada muestra (`tiempo` en ms);
 * aquí no hay `Date.now()` ni `new Date()`, así que se prueba sin temporizadores.
 */

import { UMBRAL_SACUDIDA_POR_DEFECTO, VENTANA_SACUDIDA_POR_DEFECTO } from "@/services/ajustes";

/** Muestra del acelerómetro: componentes y marca de tiempo inyectada (ms). */
export interface MuestraAceleracion {
  /** Aceleración en el eje X (g). */
  x: number;
  /** Aceleración en el eje Y (g). */
  y: number;
  /** Aceleración en el eje Z (g). */
  z: number;
  /** Marca de tiempo de la muestra en milisegundos. */
  tiempo: number;
}

/** Umbral de aceleración por defecto (15 m/s² ≈ 1,53 g). */
export const UMBRAL_SACUDIDA_POR_DEFECTO_SACUDIDA: number = UMBRAL_SACUDIDA_POR_DEFECTO;

/** Ventana de tiempo por defecto para la detección triple (2000 ms). */
export const VENTANA_SACUDIDA_POR_DEFECTO_SACUDIDA: number = VENTANA_SACUDIDA_POR_DEFECTO;

/** Número de picos que componen una sacudida triple. */
const PICOS_SACUDIDA_TRIPLE = 3;

/**
 * Magnitud del vector de aceleración de una muestra.
 */
export function muestraAceleracion(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Devuelve `true` si la magnitud de la muestra supera el umbral.
 */
export function esPico(muestra: MuestraAceleracion, umbral: number): boolean {
  return muestraAceleracion(muestra.x, muestra.y, muestra.z) > umbral;
}

/**
 * Devuelve `true` si hay al menos `PICOS_SACUDIDA_TRIPLE` picos por encima
 * del umbral dentro de una ventana de `ventanaMs` milisegundos.
 *
 * Los picos se cuentan ordenados por tiempo: se considera una ventana que
 * empieza en cada pico y se cuentan los picos siguientes mientras
 * `tiempo - tiempoInicial <= ventanaMs`.
 */
export function detectarSacudidaTriple(
  muestras: Array<MuestraAceleracion>,
  umbral: number,
  ventanaMs: number,
): boolean {
  const tiemposPicos: Array<number> = [];
  for (let i = 0; i < muestras.length; i += 1) {
    const muestra = muestras[i];
    if (esPico(muestra, umbral)) {
      tiemposPicos.push(muestra.tiempo);
    }
  }

  if (tiemposPicos.length < PICOS_SACUDIDA_TRIPLE) {
    return false;
  }

  for (let i = 0; i < tiemposPicos.length; i += 1) {
    const inicio = tiemposPicos[i];
    let contados = 1;
    for (let j = i + 1; j < tiemposPicos.length; j += 1) {
      if (tiemposPicos[j] - inicio <= ventanaMs) {
        contados += 1;
        if (contados >= PICOS_SACUDIDA_TRIPLE) {
          return true;
        }
      }
    }
  }

  return false;
}
