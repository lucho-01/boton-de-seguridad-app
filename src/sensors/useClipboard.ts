/** Hook delgado de portapapeles: solo escribe tras una acción explícita. */

import * as Clipboard from "expo-clipboard";
import { useCallback } from "react";

export interface ClipboardSensor {
  copiar(texto: string): Promise<boolean>;
}

export function useClipboard(): ClipboardSensor {
  const copiar = useCallback(async (texto: string): Promise<boolean> => {
    if (texto.length === 0) {
      return false;
    }
    try {
      return await Clipboard.setStringAsync(texto);
    } catch {
      return false;
    }
  }, []);

  return { copiar };
}
