/**
 * Hook delgado de `expo-location` para M8 (spec R1-R5).
 *
 * - Verifica que los servicios de ubicación estén habilitados antes de pedir
 *   la posición (fallo seguro: `disponible = false` si falla o está deshabilitado).
 * - Pide permiso de ubicación `WhenInUse` solo al solicitar (`R5`: sin permiso,
 *   no hay coordenadas).
 * - Una sola lectura con `getCurrentPositionAsync({ accuracy: Balanced })`.
 * - Ninguna función lanza: cualquier fallo del hardware o del permiso se absorbe
 *   y la app sigue igual.
 * - Limpia cualquier suscripción activa al desmontar (`subscription.remove()`).
 *
 * Nota de implementación: `expo-location` SDK 58 no exporta `isEnabledAsync()`;
 * se usa `hasServicesEnabledAsync()`, que es el equivalente real para saber si
 * los servicios de ubicación están activos.
 */

import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

/** Coordenadas devueltas por el sensor de ubicación. */
export interface Ubicacion {
  latitud: number;
  longitud: number;
  precision: number;
}

/** Lo que expone el hook a los controladores. */
export interface UbicacionSensor {
  /** `true` si los servicios de ubicación del dispositivo están habilitados. */
  disponible: boolean;
  /** Pide permiso y lee la ubicación una vez; `null` si no se puede obtener. */
  obtenerUbicacion(): Promise<Ubicacion | null>;
}

export function useUbicacion(): UbicacionSensor {
  const [disponible, setDisponible] = useState(false);
  const montadoRef = useRef(true);
  /** Suscripción activa de posición, si se crea; se remueve al desmontar. */
  const suscripcionRef = useRef<{ remove: () => void } | null>(null);

  /** Verifica si los servicios de ubicación están habilitados (fallo seguro). */
  async function verificarDisponibilidad(): Promise<void> {
    let habilitado = false;
    try {
      habilitado = await Location.hasServicesEnabledAsync();
    } catch {
      // Fallo seguro: se asume que no hay ubicación disponible.
      habilitado = false;
    }
    if (montadoRef.current) {
      setDisponible(habilitado);
    }
  }

  useEffect(() => {
    montadoRef.current = true;
    void verificarDisponibilidad();
    return () => {
      montadoRef.current = false;
      const suscripcion = suscripcionRef.current;
      suscripcionRef.current = null;
      if (suscripcion !== null) {
        suscripcion.remove();
      }
    };
  }, []);

  const obtenerUbicacion = useCallback(async (): Promise<Ubicacion | null> => {
    let habilitado = false;
    try {
      habilitado = await Location.hasServicesEnabledAsync();
    } catch {
      habilitado = false;
    }
    if (!habilitado) {
      return null;
    }

    let permiso = await Location.getForegroundPermissionsAsync();
    if (permiso.status !== "granted") {
      const solicitado = await Location.requestForegroundPermissionsAsync();
      if (solicitado.status !== "granted") {
        return null;
      }
      permiso = solicitado;
    }

    try {
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.LocationAccuracy.Balanced,
      });
      const coords = posicion.coords;
      const precision = coords.accuracy;
      if (precision === null) {
        return null;
      }
      return {
        latitud: coords.latitude,
        longitud: coords.longitude,
        precision,
      };
    } catch {
      return null;
    }
  }, []);

  return { disponible, obtenerUbicacion };
}
