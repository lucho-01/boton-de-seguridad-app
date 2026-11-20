/**
 * Hook delgado de `expo-sensors` (Accelerometer) para M7 (spec R1, R4 y R7).
 *
 * - Llama `Accelerometer.isAvailableAsync()` antes de suscribir (fallo seguro).
 * - `subscription.remove()` al desmontar.
 * - Nunca lanza: cualquier fallo del hardware se absorbe y la app sigue igual.
 * - La lista de muestras se pasa al controlador; este hook solo reemite
 *   lecturas del acelerómetro.
 */

import { Accelerometer, type AccelerometerMeasurement } from "expo-sensors";
import { useCallback, useEffect, useRef, useState } from "react";

/** Lo que expone el hook a los controladores. */
export interface AcelerometroController {
  /** `true` cuando el acelerómetro está disponible y se puede suscribir. */
  disponible: boolean;
  /** Suscribe un listener que recibe `(x, y, z)` en cada lectura. */
  suscribir: (onAceleracion: (x: number, y: number, z: number) => void) => void;
}

type SuscripcionAccelerometro = {
  remove: () => void;
};

/** Hook delgado de `expo-sensors`. */
export function useAcelerometro(): AcelerometroController {
  const [disponible, setDisponible] = useState<boolean>(false);
  const suscripcionRef = useRef<SuscripcionAccelerometro | null>(null);
  const listenerRef = useRef<((x: number, y: number, z: number) => void) | null>(null);

  useEffect(() => {
    setDisponible(false);
    const montadoRef = { actual: true };

    Accelerometer.isAvailableAsync()
      .then((haySensor: boolean) => {
        if (!montadoRef.actual) {
          return;
        }
        if (!haySensor) {
          setDisponible(false);
          return;
        }
        setDisponible(true);
      })
      .catch(() => {
        if (montadoRef.actual) {
          setDisponible(false);
        }
      });

    return () => {
      montadoRef.actual = false;
      const activa = suscripcionRef.current;
      suscripcionRef.current = null;
      if (activa !== null) {
        activa.remove();
      }
    };
  }, []);

  const suscribir = useCallback(
    (onAceleracion: (x: number, y: number, z: number) => void): void => {
      listenerRef.current = onAceleracion;

      const activa = suscripcionRef.current;
      if (activa !== null) {
        activa.remove();
        suscripcionRef.current = null;
      }

      if (!disponible) {
        return;
      }

      try {
        const subscripcion = Accelerometer.addListener(
          (medicion: AccelerometerMeasurement): void => {
            const callback = listenerRef.current;
            if (callback === null) {
              return;
            }
            callback(medicion.x, medicion.y, medicion.z);
          },
        );
        suscripcionRef.current = { remove: subscripcion.remove.bind(subscripcion) };
      } catch {
        setDisponible(false);
      }
    },
    [disponible],
  );

  return { disponible, suscribir };
}
