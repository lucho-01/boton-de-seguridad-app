/**
 * Endpoints de salud y autenticación (`docs/api-contrato.md` §0 y §1).
 *
 * M0 usa `comprobarHealth()` y `obtenerUsuarioActual()`; el login y el
 * registro quedan listos y probados con `fetch` simulado para M1.
 */

import type { Sesion, Usuario } from "@/models";

import { RespuestaAuthSchema, RespuestaHealthSchema, RespuestaYoSchema } from "./contracts";
import { peticion, sesionDeRespuesta, type OpcionesPeticion, type TipoFetchCache } from "./http";
import { borrarTokens, guardarTokens } from "./tokenStore";

/** Respuesta de `GET /api/health`. */
export interface EstadoServidor {
  ok: true;
  servicio: string;
  version: string;
}

/** Credenciales del formulario; `password` ≥ 8 según el contrato. */
export interface Credenciales {
  email: string;
  password: string;
}

/** `GET /api/health` (R8). Falla con `ApiError` si no responde o no valida. */
export async function comprobarHealth(fetchImpl?: TipoFetchCache): Promise<EstadoServidor> {
  const opciones: OpcionesPeticion = { fetchImpl };
  const cuerpo = await peticion("GET", "/api/health", opciones, RespuestaHealthSchema, false);
  return { ok: cuerpo.ok, servicio: cuerpo.servicio, version: cuerpo.version };
}

/**
 * `POST /api/auth/login`: guarda los tokens y devuelve la `Sesion`.
 *
 * Si la respuesta no trae `usuario`, se completa con `GET /api/auth/yo`.
 */
export async function iniciarSesion(
  credenciales: Credenciales,
  fetchImpl?: TipoFetchCache,
): Promise<Sesion> {
  const opciones: OpcionesPeticion = { cuerpo: credenciales, fetchImpl };
  const cuerpo = await peticion("POST", "/api/auth/login", opciones, RespuestaAuthSchema, false);
  await guardarTokens({ token: cuerpo.token, refresh_token: cuerpo.refreshToken });
  return sesionDeRespuesta(cuerpo, fetchImpl ?? globalThis.fetch);
}

/**
 * `POST /api/auth/registro` (201): guarda los tokens y devuelve la `Sesion`.
 *
 * Un `409` llega como `ApiError` con `estado: 409` para marcarlo en el formulario.
 */
export async function registrarCuenta(
  credenciales: Credenciales,
  fetchImpl?: TipoFetchCache,
): Promise<Sesion> {
  const opciones: OpcionesPeticion = { cuerpo: credenciales, fetchImpl };
  const cuerpo = await peticion("POST", "/api/auth/registro", opciones, RespuestaAuthSchema, false);
  await guardarTokens({ token: cuerpo.token, refresh_token: cuerpo.refreshToken });
  return sesionDeRespuesta(cuerpo, fetchImpl ?? globalThis.fetch);
}

/**
 * `GET /api/auth/yo` (autenticada, R9): confirma la sesión guardada.
 *
 * Un `401` tras el refresh llega como `ApiError` de autorización y los tokens
 * ya se borraron en `http.ts`.
 */
export async function obtenerUsuarioActual(fetchImpl?: TipoFetchCache): Promise<Usuario> {
  const opciones: OpcionesPeticion = { fetchImpl };
  const cuerpo = await peticion("GET", "/api/auth/yo", opciones, RespuestaYoSchema, true);
  return cuerpo.usuario;
}

/** Cierra la sesión local: borra los tokens (no hay endpoint de logout). */
export async function cerrarSesion(): Promise<void> {
  await borrarTokens();
}
