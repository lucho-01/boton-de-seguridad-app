/**
 * Servicio puro del armado SOS de M2 (spec R1, R4 y pregunta 3).
 *
 * Mide el tiempo transcurrido desde que la persona empieza a mantener
 * presionado el botón y decide si el armado ya se completó. El tiempo se
 * **inyecta** (`inicio` y `ahora` son `Date` añadidos por el controlador):
 * aquí no hay reloj global, hardware, red ni SQLite.
 */

/** Duración del long press que completa el armado (R1): 3000 ms. */
export const MS_ARMADO = 3000;

/** Tramo de progreso normalizado en `[0, 1]` (R4). */
export function progresoArmado(inicio: Date, ahora: Date, duracionMs: number = MS_ARMADO): number {
  if (duracionMs <= 0) {
    return 1;
  }
  const transcurrido = ahora.getTime() - inicio.getTime();
  const fraccion = transcurrido / duracionMs;
  return Math.min(1, Math.max(0, fraccion));
}

/** Lo que devuelve `evaluarArmado`: avance y milisegundos que faltan. */
export interface EvaluacionArmado {
  /** `true` cuando ya transcurrieron al menos `duracionMs` (R1). */
  completado: boolean;
  /** Progreso entre 0 y 1 (R4). */
  progreso: number;
  /** Milisegundos que faltan para completar; nunca negativo. */
  restante_ms: number;
}

/** Entrada de `evaluarArmado`; toda la información es tiempo inyectado. */
export interface ParametrosArmado {
  inicio: Date;
  ahora: Date;
  duracionMs?: number;
}

/**
 * Evalúa el armado en un instante concreto (R1 y R4).
 *
 * Con 2999 ms `completado` es `false` y queda 1 ms; a partir de 3000 ms
 * `completado` es `true` y `restante_ms` es 0.
 */
export function evaluarArmado({
  inicio,
  ahora,
  duracionMs = MS_ARMADO,
}: ParametrosArmado): EvaluacionArmado {
  if (duracionMs <= 0) {
    return { completado: true, progreso: 1, restante_ms: 0 };
  }
  const transcurrido = ahora.getTime() - inicio.getTime();
  const restanteEnBruto = duracionMs - transcurrido;
  const restanteMs = Math.max(0, restanteEnBruto);
  const progreso = progresoArmado(inicio, ahora, duracionMs);
  const completado = transcurrido >= duracionMs;
  return { completado, progreso, restante_ms: restanteMs };
}
