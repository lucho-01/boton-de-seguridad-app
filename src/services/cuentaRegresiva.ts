/**
 * Reglas puras de la cuenta regresiva de M3 (spec R1–R3).
 *
 * El tiempo se inyecta (`inicio` y `ahora`): este módulo no lee el reloj, no
 * usa hardware y no toca la red, así que se prueba sin temporizadores.
 */

/** Duración de la cuenta regresiva después de armar la alerta (R1). */
export const MS_CUENTA = 5000;

/** Resultado de evaluar la cuenta en un instante concreto. */
export interface EvaluacionCuenta {
  /** Milisegundos transcurridos desde el inicio; nunca negativos. */
  transcurridoMs: number;
  /** Segundos que faltan, de 5 a 0 (R2). */
  restanteSegundos: number;
  /** Avance entre 0 y 1 (R3). */
  progreso: number;
  /** `true` cuando se alcanzan los 5000 ms. */
  completada: boolean;
}

interface ParametrosCuenta {
  /** Instante en que arrancó la cuenta. */
  inicio: Date;
  /** Instante actual, inyectado por el controlador. */
  ahora: Date;
}

/** Evalúa la cuenta: restante, progreso y si ya terminó (R2 y R3). */
export function evaluarCuenta({ inicio, ahora }: ParametrosCuenta): EvaluacionCuenta {
  const transcurridoMs = Math.max(0, ahora.getTime() - inicio.getTime());
  const completada = transcurridoMs >= MS_CUENTA;
  const progreso = Math.min(1, transcurridoMs / MS_CUENTA);
  const restanteSegundos = Math.max(0, Math.ceil((MS_CUENTA - transcurridoMs) / 1000));
  return { transcurridoMs, restanteSegundos, progreso, completada };
}
