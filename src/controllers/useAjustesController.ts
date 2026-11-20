/**
 * Controlador de ajustes de M6.
 *
 * Une el servicio puro de ajustes y el repositorio de ajustes. El repositorio
 * es inyectable: por defecto usa SQLite, y las pruebas pueden pasar un doble
 * en memoria sin tocar la base de datos.
 *
 * Los cambios se aplican inmediatamente a la sesión actual (estado) y se
 * persisten en SQLite solo al llamar a `guardar()`.
 */

import { useCallback, useEffect, useState } from "react";

import { AjustesRepositorySqlite, type AjustesRepository } from "@/repositories/ajustes";
import {
  ERROR_ESCRITURA_AJUSTES,
  MENSAJE_AJUSTES_GUARDADOS,
  MENSAJE_AJUSTES_REESTABLECIDOS,
  validarMensajeBase,
  valoresPorDefecto,
} from "@/services/ajustes";

export interface Ajustes {
  umbralSacudida: number;
  ventanaSacudida: number;
  mensajeBase: string;
}

export interface AjustesController {
  ajustes: Ajustes;
  cargando: boolean;
  puedeGuardar: boolean;
  aviso: string | null;
  actualizarMensajeBase(mensaje: string): Promise<{ ok: boolean; error?: string }>;
  actualizarSensibilidad(umbralSacudida: number, ventanaSacudida: number): Promise<void>;
  restablecerValoresPorDefecto(): Promise<void>;
  guardar(): Promise<void>;
}

/** Lee un número guardado como texto, o el valor por defecto si no hay nada. */
function leerNumeroGuardado(valorGuardado: string | null, defecto: number): number {
  if (valorGuardado === null) {
    return defecto;
  }
  const valor = Number(valorGuardado);
  if (Number.isNaN(valor)) {
    return defecto;
  }
  return valor;
}

/** Indica si dos ajustes difieren en algún campo. */
function ajustesCambiados(actual: Ajustes, originales: Ajustes): boolean {
  if (actual.umbralSacudida !== originales.umbralSacudida) {
    return true;
  }
  if (actual.ventanaSacudida !== originales.ventanaSacudida) {
    return true;
  }
  if (actual.mensajeBase !== originales.mensajeBase) {
    return true;
  }
  return false;
}

/** Valida que el umbral y la ventana sean mayores a cero. */
function sensibilidadValida(umbralSacudida: number, ventanaSacudida: number): boolean {
  if (umbralSacudida <= 0) {
    return false;
  }
  if (ventanaSacudida <= 0) {
    return false;
  }
  return true;
}

/** Convierte los valores actuales en pares clave/valor para guardar. */
function paresAGuardar(ajustes: Ajustes): Array<{ clave: string; valor: string }> {
  return [
    { clave: "umbral_sacudida", valor: String(ajustes.umbralSacudida) },
    { clave: "ventana_sacudida", valor: String(ajustes.ventanaSacudida) },
    { clave: "mensaje_base", valor: ajustes.mensajeBase },
  ];
}

/**
 * Hook de ajustes: carga, edición, restablecer y guardar.
 * El repositorio es inyectable: por defecto usa SQLite.
 */
export function useAjustesController(repositorio?: AjustesRepository): AjustesController {
  const base = repositorio ?? new AjustesRepositorySqlite();
  const [ajustes, setAjustes] = useState<Ajustes>(valoresPorDefecto());
  const [ajustesOriginales, setAjustesOriginales] = useState<Ajustes>(valoresPorDefecto());
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  /** Lee las claves desde el repositorio; si no existen, usa los valores por defecto. */
  const cargar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const defecto = valoresPorDefecto();
      const umbralRaw = await base.obtenerClave("umbral_sacudida");
      const ventanaRaw = await base.obtenerClave("ventana_sacudida");
      const mensajeRaw = await base.obtenerClave("mensaje_base");
      let mensajeLeido: string;
      if (mensajeRaw === null) {
        mensajeLeido = defecto.mensajeBase;
      } else {
        mensajeLeido = mensajeRaw;
      }
      const siguientes: Ajustes = {
        umbralSacudida: leerNumeroGuardado(umbralRaw, defecto.umbralSacudida),
        ventanaSacudida: leerNumeroGuardado(ventanaRaw, defecto.ventanaSacudida),
        mensajeBase: mensajeLeido,
      };
      setAjustes(siguientes);
      setAjustesOriginales(siguientes);
    } finally {
      setCargando(false);
    }
  }, [base]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const puedeGuardar = ajustesCambiados(ajustes, ajustesOriginales);

  /** Valida y actualiza el mensaje base en la sesión actual. */
  const actualizarMensajeBase = useCallback(
    async (mensaje: string): Promise<{ ok: boolean; error?: string }> => {
      const validacion = validarMensajeBase(mensaje);
      if (!validacion.ok) {
        return { ok: false, error: validacion.error };
      }
      setAjustes((actual) => ({ ...actual, mensajeBase: mensaje }));
      return { ok: true };
    },
    [],
  );

  /** Valida y actualiza la sensibilidad en la sesión actual. */
  const actualizarSensibilidad = useCallback(
    async (umbralSacudida: number, ventanaSacudida: number): Promise<void> => {
      if (!sensibilidadValida(umbralSacudida, ventanaSacudida)) {
        return;
      }
      setAjustes((actual) => ({
        ...actual,
        umbralSacudida,
        ventanaSacudida,
      }));
    },
    [],
  );

  /** Vuelve a los valores por defecto del servicio en la sesión actual. */
  const restablecerValoresPorDefecto = useCallback(async (): Promise<void> => {
    const defecto = valoresPorDefecto();
    setAjustes(defecto);
    setAviso(MENSAJE_AJUSTES_REESTABLECIDOS);
  }, []);

  /** Guarda todos los cambios en SQLite con `INSERT OR REPLACE` por clave. */
  const guardar = useCallback(async (): Promise<void> => {
    try {
      const pares = paresAGuardar(ajustes);
      for (let i = 0; i < pares.length; i += 1) {
        const par = pares[i];
        await base.guardarClave(par.clave, par.valor);
      }
      setAjustesOriginales(ajustes);
      setAviso(MENSAJE_AJUSTES_GUARDADOS);
    } catch {
      setAviso(ERROR_ESCRITURA_AJUSTES);
    }
  }, [base, ajustes]);

  return {
    ajustes,
    cargando,
    puedeGuardar,
    aviso,
    actualizarMensajeBase,
    actualizarSensibilidad,
    restablecerValoresPorDefecto,
    guardar,
  };
}
