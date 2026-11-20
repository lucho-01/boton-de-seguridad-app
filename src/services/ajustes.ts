/**
 * Servicio puro de ajustes (M6).
 *
 * Sin hardware, red ni SQLite. Todos los textos son en español y se exportan
 * para que la vista no invente mensajes. Las claves usan `snake_case`
 * (contrato de SQLite): `umbral_sacudida`, `ventana_sacudida`, `mensaje_base`.
 *
 * El tiempo se inyecta cuando es necesario; este servicio no usa reloj
 * global, por lo que no hay `new Date()` ni `Date.now()` aquí.
 */

export const MENSAJE_BASE_POR_DEFECTO =
  "Alerta de seguridad: necesito ayuda. Mi ubicación es [enlace de mapa].";

export const LIMITE_MENSAJE_BASE = 160;

export const UMBRAL_SACUDIDA_POR_DEFECTO = 15;
export const VENTANA_SACUDIDA_POR_DEFECTO = 2000;

export const ERROR_MENSAJE_BASE_LARGO = "El mensaje base no puede superar los 160 caracteres.";
export const ERROR_ESCRITURA_AJUSTES = "No se pudieron guardar los ajustes. Intenta otra vez.";
export const MENSAJE_AJUSTES_GUARDADOS = "Ajustes guardados.";
export const MENSAJE_AJUSTES_REESTABLECIDOS = "Ajustes restablecidos a los valores por defecto.";

/** Valores de ajuste de sensibilidad y mensaje base. */
export interface ValoresAjustes {
  umbralSacudida: number;
  ventanaSacudida: number;
  mensajeBase: string;
}

/** Devuelve los valores por defecto de sensibilidad y mensaje base (R1, R3). */
export function valoresPorDefecto(): ValoresAjustes {
  return {
    umbralSacudida: UMBRAL_SACUDIDA_POR_DEFECTO,
    ventanaSacudida: VENTANA_SACUDIDA_POR_DEFECTO,
    mensajeBase: MENSAJE_BASE_POR_DEFECTO,
  };
}

/** Devuelve las claves que se usan para persistir los ajustes (snake_case). */
export function clavesAjustes(): string[] {
  return ["umbral_sacudida", "ventana_sacudida", "mensaje_base"];
}

/** Resultado de `validarMensajeBase`. */
export interface ResultadoValidacionMensaje {
  ok: boolean;
  error?: string;
}

/**
 * Valida que el mensaje base no supere los 160 caracteres (R2).
 * El mensaje vacío es válido (se puede borrar).
 */
export function validarMensajeBase(mensaje: string): ResultadoValidacionMensaje {
  if (mensaje.length > LIMITE_MENSAJE_BASE) {
    return { ok: false, error: ERROR_MENSAJE_BASE_LARGO };
  }
  return { ok: true };
}
