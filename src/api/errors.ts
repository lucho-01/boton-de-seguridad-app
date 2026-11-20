/**
 * Error normalizado del cliente HTTP (spec M0 · R2, R6, R8 y §7).
 *
 * El mensaje es siempre uno de los textos fijos de §7: nunca se copia el
 * cuerpo de la respuesta, ni `detalles` internos, ni la URL.
 */
import type { z } from "zod";

import type { DetalleError } from "@/models";

import { ErrorApiSchema } from "./contracts";

/** Familia del fallo; sirve para decidir la interfaz sin leer el texto. */
export type MotivoApi =
  | "red"
  | "tiempo"
  | "configuracion"
  | "validacion"
  | "servidor"
  | "autorizacion"
  | "demasiados_intentos"
  | "desconocido";

/** Textos que ve la persona (spec §7). */
const MENSAJES: Readonly<Record<MotivoApi, string>> = {
  red: "Sin conexión con el servidor.",
  tiempo: "Sin conexión con el servidor.",
  configuracion: "Falta configurar el servidor.",
  validacion: "Respuesta del servidor no válida.",
  servidor: "Error del servidor. Inténtalo más tarde.",
  autorizacion: "Tu sesión expiró. Vuelve a iniciar sesión.",
  demasiados_intentos: "Demasiados intentos; espera un momento.",
  desconocido: "No se pudo completar la operación.",
};

/** Error del cliente HTTP listo para mostrarse. */
export class ApiError extends Error {
  /** Código HTTP; `null` si no hubo respuesta (red, tiempo, configuración). */
  readonly estado: number | null;
  /** Campos con problema para marcar formularios; nunca se muestran crudos. */
  readonly detalles: DetalleError[];
  /** Familia del fallo. */
  readonly motivo: MotivoApi;

  constructor(motivo: MotivoApi, estado: number | null, detalles: DetalleError[] = []) {
    super(MENSAJES[motivo]);
    this.name = "ApiError";
    this.motivo = motivo;
    this.estado = estado;
    this.detalles = detalles;
  }

  /** `true` si la sesión ya no sirve y hay que volver al login (R5). */
  get sesion_invalida(): boolean {
    return this.motivo === "autorizacion";
  }
}

/**
 * Error de la API a partir de un cuerpo que no validó su esquema.
 *
 * @param estado Código HTTP recibido.
 * @param cuerpoCandidato Cuerpo ya leído; puede ser `{ error, detalles? }`.
 */
export function errorDeRespuesta(estado: number, cuerpoCandidato: object | null): ApiError {
  if (estado === 401 || estado === 403) {
    return new ApiError("autorizacion", estado);
  }
  if (estado === 429) {
    return new ApiError("demasiados_intentos", estado);
  }
  if (perteneceARangoDelServidor(estado)) {
    return new ApiError("servidor", estado);
  }
  return new ApiError("desconocido", estado, detallesDe(cuerpoCandidato));
}

/**
 * Error a partir de una respuesta que llegó pero cuyo cuerpo no validó (R6).
 *
 * @param estado Código HTTP recibido.
 */
export function errorDeValidacion(estado: number): ApiError {
  return new ApiError("validacion", estado);
}

/**
 * Error de red, de tiempo de espera o de configuración, sin código HTTP.
 *
 * @param motivo `red`, `tiempo` o `configuracion`.
 */
export function errorSinRespuesta(
  motivo: "red" | "tiempo" | "configuracion" | "desconocido",
): ApiError {
  return new ApiError(motivo, null);
}

/**
 * Adapta cualquier fallo a `ApiError`: si ya lo es, lo devuelve tal cual.
 *
 * @param fallo Valor atrapado en un `catch`.
 */
export function aApiError(fallo: object | null, motivo: MotivoApi = "desconocido"): ApiError {
  if (fallo instanceof ApiError) {
    return fallo;
  }
  return new ApiError(motivo, null);
}

/** `500`–`599`. */
function perteneceARangoDelServidor(estado: number): boolean {
  if (estado < 500) {
    return false;
  }
  return estado <= 599;
}

/**
 * `detalles` del cuerpo solo si cumple la forma `{ error, detalles? }`.
 * Un cuerpo que no cumple no aporta nada: se descarta entero.
 */
function detallesDe(cuerpoCandidato: object | null): DetalleError[] {
  if (cuerpoCandidato === null) {
    return [];
  }
  const lectura = ErrorApiSchema.safeParse(cuerpoCandidato);
  if (!lectura.success) {
    return [];
  }
  return lectura.data.detalles ?? [];
}

/** Esquema válido de la forma de error; se reexporta para las pruebas. */
export const ESQUEMA_ERROR_API = ErrorApiSchema;

/** Tipo Zod inferido de la forma de error. */
export type CuerpoErrorApi = z.infer<typeof ESQUEMA_ERROR_API>;
