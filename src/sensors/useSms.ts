/** Sensor delgado de expo-sms para M10. Solo abre el redactor nativo. */

import * as SMS from "expo-sms";
import { useCallback, useEffect, useRef, useState } from "react";

export interface SmsSensor {
  disponible: boolean;
  abrirRedactor(destinatarios: string[], mensaje: string): Promise<boolean>;
}

export function useSms(): SmsSensor {
  const [disponible, setDisponible] = useState(false);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    SMS.isAvailableAsync()
      .then((valor) => {
        if (montadoRef.current) {
          setDisponible(valor);
        }
      })
      .catch(() => {
        if (montadoRef.current) {
          setDisponible(false);
        }
      });
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const abrirRedactor = useCallback(
    async (destinatarios: string[], mensaje: string) => {
      if (!disponible || destinatarios.length === 0 || mensaje.length === 0) {
        return false;
      }
      try {
        await SMS.sendSMSAsync(destinatarios, mensaje);
        return true;
      } catch {
        return false;
      }
    },
    [disponible],
  );

  return { disponible, abrirRedactor };
}
