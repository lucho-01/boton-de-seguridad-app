/** Registra en SQLite el resultado de cada flujo SOS (M12). */

import { useEffect, useRef, useState } from "react";

import type { EstadoArmado, UbicacionControlador } from "@/controllers/useArmadoController";
import { AlertasRepositorySqlite, type AlertasRepository } from "@/repositories/alertas";
import { crearAlerta } from "@/services/alertas";

export interface DatosRegistroAlerta {
  estado: EstadoArmado;
  ubicacion: UbicacionControlador | null;
  ubicacionLista: boolean;
  bateriaPct: number | null;
}

export function useRegistrarAlertaController(
  datos: DatosRegistroAlerta,
  repository?: AlertasRepository,
): string | null {
  const [repositorio] = useState(() => repository ?? new AlertasRepositorySqlite());
  const [aviso, setAviso] = useState<string | null>(null);
  const estadoAnterior = useRef<EstadoArmado>("idle");
  const preparadaRegistrada = useRef(false);

  useEffect(() => {
    const anterior = estadoAnterior.current;
    estadoAnterior.current = datos.estado;

    if (datos.estado === "lista" && datos.ubicacionLista && !preparadaRegistrada.current) {
      preparadaRegistrada.current = true;
      void registrar("mensaje_preparado");
    }
    if (datos.estado === "idle") {
      if (anterior === "arming" || anterior === "countdown") {
        void registrar("cancelada");
      }
      if (anterior === "lista" && !preparadaRegistrada.current) {
        void registrar("mensaje_preparado");
      }
      preparadaRegistrada.current = false;
    }
  }, [datos.estado, datos.ubicacion, datos.ubicacionLista, datos.bateriaPct]);

  async function registrar(estado: "cancelada" | "mensaje_preparado"): Promise<void> {
    const ubicacion = datos.ubicacion;
    const alerta = crearAlerta(
      {
        estado,
        lat: ubicacion?.lat ?? null,
        lng: ubicacion?.lng ?? null,
        precision_m: ubicacion?.precision ?? null,
        bateria_pct: redondearBateria(datos.bateriaPct),
      },
      new Date(),
    );
    try {
      await repositorio.guardar(alerta);
      setAviso(null);
    } catch {
      setAviso("No se pudo guardar la alerta en el historial local.");
    }
  }

  return aviso;
}

function redondearBateria(porcentaje: number | null): number | null {
  if (porcentaje === null) {
    return null;
  }
  return Math.round(porcentaje);
}
