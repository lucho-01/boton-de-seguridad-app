/** Controlador local de consulta de alertas (M12). */

import { useCallback, useState } from "react";

import { AlertasRepositorySqlite, type AlertasRepository } from "@/repositories/alertas";
import type { Alerta } from "@/models";

export interface HistorialController {
  alertas: Alerta[];
  cargando: boolean;
  aviso: string | null;
  refrescar(): Promise<void>;
}

export function useHistorialController(repository?: AlertasRepository): HistorialController {
  const [repositorio] = useState(() => repository ?? new AlertasRepositorySqlite());
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  const refrescar = useCallback(async (): Promise<void> => {
    setCargando(true);
    setAviso(null);
    try {
      const resultado = await repositorio.listar();
      setAlertas(resultado);
    } catch {
      setAviso("No se pudo cargar el historial. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [repositorio]);

  return { alertas, cargando, aviso, refrescar };
}
