/** Controlador de estado para sincronización automática y reintento (M14). */

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/api";
import { CuentaSincronizacionDiferenteError, sincronizarDatos } from "@/sync/sincronizar";

export type EstadoSincronizacion =
  "sin_sesion" | "pendiente" | "sincronizando" | "sincronizado" | "error" | "cuenta_diferente";

export interface SincronizacionController {
  estado: EstadoSincronizacion;
  mensaje: string;
  sincronizar(): Promise<void>;
  esperar(): Promise<void>;
}

function mensajeDeEstado(estado: EstadoSincronizacion): string {
  if (estado === "sin_sesion") {
    return "Inicia sesión para sincronizar. Tus datos permanecen en este dispositivo.";
  }
  if (estado === "pendiente") {
    return "La sincronización empezará automáticamente.";
  }
  if (estado === "sincronizando") {
    return "Sincronizando contactos y alertas…";
  }
  if (estado === "sincronizado") {
    return "Contactos y alertas sincronizados.";
  }
  if (estado === "cuenta_diferente") {
    return "Este dispositivo ya está vinculado a otra cuenta. No se sincronizaron los datos.";
  }
  return "No se pudo sincronizar. Inténtalo de nuevo cuando tengas conexión.";
}

function estadoDeFallo(fallo: Error): EstadoSincronizacion {
  if (fallo instanceof CuentaSincronizacionDiferenteError) {
    return "cuenta_diferente";
  }
  return "error";
}

function mensajeDeFallo(fallo: Error): string {
  if (fallo instanceof ApiError) {
    return fallo.message;
  }
  return "No se pudo sincronizar. Inténtalo de nuevo cuando tengas conexión.";
}

export function useSincronizacionController(usuarioId: string | null): SincronizacionController {
  const [estado, setEstado] = useState<EstadoSincronizacion>("sin_sesion");
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const trabajoEnCurso = useRef<Promise<void> | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (usuarioId === null) {
      setEstado("sin_sesion");
      setMensajeError(null);
      return;
    }
    setEstado("pendiente");
    setMensajeError(null);
  }, [usuarioId]);

  const sincronizar = useCallback(async (): Promise<void> => {
    if (usuarioId === null) {
      setEstado("sin_sesion");
      return;
    }
    if (trabajoEnCurso.current !== null) {
      return trabajoEnCurso.current;
    }
    setEstado("sincronizando");
    setMensajeError(null);
    const trabajo = sincronizarDatos(usuarioId)
      .then(() => {
        if (montado.current) {
          setEstado("sincronizado");
        }
      })
      .catch((fallo: Error) => {
        if (montado.current) {
          setEstado(estadoDeFallo(fallo));
          setMensajeError(mensajeDeFallo(fallo));
        }
      })
      .finally(() => {
        trabajoEnCurso.current = null;
      });
    trabajoEnCurso.current = trabajo;
    return trabajo;
  }, [usuarioId]);

  const esperar = useCallback(async (): Promise<void> => {
    if (trabajoEnCurso.current !== null) {
      await trabajoEnCurso.current;
    }
  }, []);

  let mensaje = mensajeDeEstado(estado);
  if (estado === "error" && mensajeError !== null) {
    mensaje = mensajeError;
  }
  return { estado, mensaje, sincronizar, esperar };
}
