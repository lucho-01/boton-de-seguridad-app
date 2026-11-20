/**
 * Hook delgado de `expo-battery` para M9 (spec §4).
 *
 * - Lee el nivel de batería una sola vez al montar.
 * - Verifica disponibilidad con `Battery.isAvailableAsync()`.
 * - `expo-battery` no requiere permiso especial en Expo 58.
 * - Ninguna función lanza: cualquier fallo se absorbe (fallo seguro).
 */

import * as Battery from "expo-battery";
import { useEffect, useRef, useState } from "react";

/** Lo que expone el hook al controlador. */
export interface BateriaSensor {
  /** `true` si el nivel de batería del dispositivo está disponible. */
  disponible: boolean;
  /** Porcentaje de batería (0-100) leído una vez; `null` si no está disponible. */
  porcentaje: number | null;
}

export function useBateria(): BateriaSensor {
  const [disponible, setDisponible] = useState(false);
  const [porcentaje, setPorcentaje] = useState<number | null>(null);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;

    async function leerBateria(): Promise<void> {
      let estaDisponible = false;
      try {
        estaDisponible = await Battery.isAvailableAsync();
      } catch {
        // Fallo seguro: se asume que no hay batería disponible.
        estaDisponible = false;
      }
      if (!montadoRef.current) {
        return;
      }
      setDisponible(estaDisponible);

      if (estaDisponible) {
        try {
          const nivel = await Battery.getBatteryLevelAsync();
          // `getBatteryLevelAsync()` devuelve -1 cuando el dispositivo no
          // proporciona el nivel; en ese caso no hay porcentaje válido.
          if (montadoRef.current) {
            if (nivel < 0) {
              setPorcentaje(null);
            } else {
              setPorcentaje(nivel * 100);
            }
          }
        } catch {
          if (montadoRef.current) {
            setPorcentaje(null);
          }
        }
      }
    }

    void leerBateria();

    return () => {
      montadoRef.current = false;
    };
  }, []);

  return { disponible, porcentaje };
}
