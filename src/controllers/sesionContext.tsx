/**
 * Proveedor de sesión (M0): contexto React sobre `useSesionController`
 * (decisión 4 de la spec).
 *
 * `app/_layout.tsx` lo monta en la raíz y `app/ajustes.tsx` consume `useSesion()`.
 * Si alguien usa `useSesion()` fuera del proveedor se lanza un error claro.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useSesionController, type SesionController } from "./useSesionController";

const SesionContext = createContext<SesionController | null>(null);

/** Envuelve la app; las pantallas leen el estado con `useSesion()`. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const controlador = useSesionController();
  const valor = useMemo<SesionController>(() => controlador, [controlador]);
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
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
