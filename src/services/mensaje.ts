/**
 * Composición pura del mensaje SOS para M10.
 * No usa hardware, red, relojes ni almacenamiento.
 */

export const LIMITE_MENSAJE_SMS = 160;
export const MARCADOR_ENLACE = "[enlace de mapa]";

export interface DatosMensajeSms {
  mensajeBase: string;
  lat: number | null;
  lng: number | null;
  bateriaPct: number | null;
}

export interface MensajeSmsCompuesto {
  mensaje: string;
  longitud: number;
  tieneUbicacion: boolean;
  tieneBateria: boolean;
}

export function crearEnlaceMapa(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function componerMensajeSms(datos: DatosMensajeSms): MensajeSmsCompuesto {
  const tieneUbicacion = datos.lat !== null && datos.lng !== null;
  const tieneBateria = datos.bateriaPct !== null;

  let base = datos.mensajeBase.trim();
  if (tieneUbicacion) {
    base = base.replace(MARCADOR_ENLACE, crearEnlaceMapa(datos.lat as number, datos.lng as number));
  } else {
    base = base.replace(MARCADOR_ENLACE, "").trim();
  }
  if (tieneUbicacion && base.length === 0) {
    base = crearEnlaceMapa(datos.lat as number, datos.lng as number);
  }

  let bateria = "";
  if (tieneBateria) {
    bateria = ` Bateria: ${Math.round(datos.bateriaPct as number)}%.`;
  }

  let mensaje = base;
  if (tieneUbicacion) {
    mensaje = `${base}${bateria}`;
  } else if (base.length > 0) {
    mensaje = `${base}. Sin ubicación disponible.${bateria}`;
  } else {
    mensaje = `Sin ubicación disponible.${bateria}`;
  }

  let enlace = "";
  if (tieneUbicacion) {
    enlace = crearEnlaceMapa(datos.lat as number, datos.lng as number);
  }
  if (mensaje.length > LIMITE_MENSAJE_SMS) {
    mensaje = recortarBaseSinRomperEnlace(base, bateria, enlace);
  }
  if (mensaje.length > LIMITE_MENSAJE_SMS) {
    mensaje = mensaje.slice(0, LIMITE_MENSAJE_SMS);
  }

  return {
    mensaje,
    longitud: mensaje.length,
    tieneUbicacion,
    tieneBateria,
  };
}

function recortarBaseSinRomperEnlace(base: string, bateria: string, enlace: string): string {
  const finalBateria = bateria;
  if (enlace.length > 0) {
    const disponible = LIMITE_MENSAJE_SMS - enlace.length - finalBateria.length - 1;
    let baseRecortada = base.replace(enlace, "").trim();
    if (baseRecortada.length > disponible) {
      baseRecortada = `${baseRecortada.slice(0, Math.max(0, disponible - 1)).trim()}…`;
    }
    if (baseRecortada.length > 0) {
      return `${baseRecortada} ${enlace}${finalBateria}`;
    }
    return `${enlace}${finalBateria}`;
  }
  const sinUbicacion = "Sin ubicación disponible.";
  const disponible = LIMITE_MENSAJE_SMS - sinUbicacion.length - finalBateria.length - 1;
  let baseRecortada = base.trim();
  if (baseRecortada.length > disponible) {
    baseRecortada = `${baseRecortada.slice(0, Math.max(0, disponible - 1)).trim()}…`;
  }
  if (baseRecortada.length > 0) {
    return `${baseRecortada}. ${sinUbicacion}${finalBateria}`;
  }
  return `${sinUbicacion}${finalBateria}`;
}
