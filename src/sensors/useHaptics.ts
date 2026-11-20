/**
 * Hook delgado de `expo-haptics` para M2 y M3 (§4 y §7 de la spec).
 *
 * - **Sin vibración de sondeo:** `expo-haptics` 58 no expone
 *   `Haptics.isAvailableAsync()` (su API es `impactAsync`, que rechaza con
 *   `UnavailabilityError` cuando no hay motor háptico). Sondear con un impacto
 *   real vibraría al abrir la pantalla, fuera de los eventos previstos por la
 *   spec (inicio de la cuenta y cancelación). La disponibilidad se deduce de
 *   los intentos reales: cada fallo se absorbe y el flujo sigue igual (§7).
 * - Ninguna función lanza: cualquier fallo del hardware se absorbe (fallo
 *   seguro) y la app sigue igual.
 * - La única espera es la pausa de 70 ms entre los dos impactos: su
 *   `setTimeout` se guarda en un ref y se cancela al desmontar o al empezar
 *   otra espera (R7), así no queda ningún temporizador huérfano.
 */

import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef } from "react";

/** Lo que expone el hook a los controladores. */
export interface HapticsController {
  /** Impacto ligero al empezar a mantener presionado (pregunta 4). */
  vibrarInicio: () => Promise<void>;
  /** Dos impactos seguidos al completar el armado (pregunta 4). */
  vibrarCompletado: () => Promise<void>;
}

/** Pausa entre los dos impactos de `vibrarCompletado` (ms). */
const MS_ENTRE_IMPACTOS = 70;

/** Espera cancelable: `cancelar()` limpia el `setTimeout` y resuelve sin rechazar. */
function esperar(ms: number): {
  espera: Promise<void>;
  cancelar: () => void;
} {
  let id: ReturnType<typeof setTimeout> | null = null;
  let resolver: () => void = () => undefined;
  const espera = new Promise<void>((resolve) => {
    resolver = resolve;
    id = setTimeout(() => {
      id = null;
      resolve();
    }, ms);
  });
  const cancelar = () => {
    if (id !== null) {
      clearTimeout(id);
      id = null;
    }
    // Cancelar resuelve la promesa: ninguna función devuelve un rechazo (§7).
    resolver();
  };
  return { espera, cancelar };
}

/** Un impacto háptico concreto y su resultado observado (nunca lanza). */
async function intentarImpacto(estilo: Haptics.ImpactFeedbackStyle): Promise<boolean> {
  try {
    await Haptics.impactAsync(estilo);
    return true;
  } catch {
    return false;
  }
}

/** Háptica opcional del armado SOS. */
export function useHaptics(): HapticsController {
  const montadoRef = useRef(true);
  /** Cancela la espera activa entre los dos impactos; `null` si no hay ninguna. */
  const cancelarEsperaRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      const activa = cancelarEsperaRef.current;
      cancelarEsperaRef.current = null;
      if (activa !== null) {
        activa();
      }
    };
  }, []);

  const vibrarInicio = useCallback(async () => {
    await intentarImpacto(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const vibrarCompletado = useCallback(async () => {
    const activa = cancelarEsperaRef.current;
    cancelarEsperaRef.current = null;
    if (activa !== null) {
      activa();
    }
    const primero = await intentarImpacto(Haptics.ImpactFeedbackStyle.Medium);
    if (!primero) {
      return;
    }
    const { espera, cancelar } = esperar(MS_ENTRE_IMPACTOS);
    cancelarEsperaRef.current = cancelar;
    await espera;
    cancelarEsperaRef.current = null;
    if (!montadoRef.current) {
      return;
    }
    await intentarImpacto(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return { vibrarInicio, vibrarCompletado };
}
