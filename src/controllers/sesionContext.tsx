/**
 * Proveedor de sesión (M0): contexto React sobre `useSesionController`
 * (decisión 4 de la spec).
 *
 * `app/_layout.tsx` lo monta en la raíz y `app/ajustes.tsx` consume `useSesion()`.
 * Si alguien usa `useSesion()` fuera del proveedor se lanza un error claro.
 */

import { useCallback, useContext, useEffect, useMemo, createContext, type ReactNode } from "react";
import { AppState } from "react-native";

import { useSesionController, type SesionController } from "./useSesionController";
import {
  useSincronizacionController,
  type SincronizacionController,
} from "./useSincronizacionController";

const SesionContext = createContext<SesionController | null>(null);
const SincronizacionContext = createContext<SincronizacionController | null>(null);

/** Envuelve la app; las pantallas leen el estado con `useSesion()`. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const controlador = useSesionController();
  const usuarioId = controlador.sesion?.usuario.id ?? null;
  const sincronizacion = useSincronizacionController(usuarioId);
  const cerrar = useCallback(async () => {
    await sincronizacion.esperar();
    await controlador.cerrar();
  }, [controlador.cerrar, sincronizacion.esperar]);
  const valor = useMemo<SesionController>(
    () => ({ ...controlador, cerrar }),
    [controlador, cerrar],
  );

  useEffect(() => {
    if (controlador.iniciando || usuarioId === null) {
      return;
    }
    void sincronizacion.sincronizar();
  }, [controlador.iniciando, usuarioId, sincronizacion.sincronizar]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active" && usuarioId !== null) {
        void sincronizacion.sincronizar();
      }
    });
    return () => {
      suscripcion.remove();
    };
  }, [usuarioId, sincronizacion.sincronizar]);

  return (
    <SesionContext.Provider value={valor}>
      <SincronizacionContext.Provider value={sincronizacion}>
        {children}
      </SincronizacionContext.Provider>
    </SesionContext.Provider>
  );
}

/**
 * Estado de sesión y acciones.
 *
 * @throws Error si se usa fuera de `SesionProvider`.
 */
export function useSesion(): SesionController {
  const valor = useContext(SesionContext);
  if (valor === null) {
    throw new Error(
      "useSesion() debe usarse dentro de <SesionProvider>. Envuelve la app en app/_layout.tsx.",
    );
  }
  return valor;
}

export function useSincronizacion(): SincronizacionController {
  const valor = useContext(SincronizacionContext);
  if (valor === null) {
    throw new Error(
      "useSincronizacion() debe usarse dentro de <SesionProvider>. Envuelve la app en app/_layout.tsx.",
    );
  }
  return valor;
}
