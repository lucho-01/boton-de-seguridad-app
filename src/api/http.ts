/**
 * Núcleo del cliente HTTP (spec M0 · R2, R3, R5, R6, R8).
 *
 * - `Authorization: Bearer` en rutas privadas.
 * - Ante `401`: **un** refresh y **un** reintento; si el refresh falla, se
 *   borran los tokens y se lanza `ApiError` de autorización (nunca en bucle).
 * - Timeout de 10 s con `AbortController`.
 * - El cuerpo se valida siempre con el esquema Zod que entrega quien llama.
 *
 * Sin `any`/`unknown`: lo externo entra como `Error | null` rumbo a Zod y el
 * `fetch` se tipa con `TipoFetchCache` para inyectarlo en las pruebas.
 */

import type { z } from "zod";

import type { Sesion, Usuario } from "@/models";

import { obtenerApiUrl } from "./config";
import { RespuestaAuthSchema, RespuestaYoSchema } from "./contracts";
import { ApiError, errorDeRespuesta, errorDeValidacion, errorSinRespuesta } from "./errors";
import { borrarTokens, guardarTokens, leerTokens, type TokensGuardados } from "./tokenStore";

/** Tiempo máximo por petición (decisión 3 de la spec). */
export const MS_TIEMPO_LIMITE = 10_000;

/** Ruta de renovación: un `401` suyo no dispara otro refresh. */
const RUTA_REFRESH = "/api/auth/refresh";

/** Ruta que confirma la sesión guardada (R9). */
const RUTA_YO = "/api/auth/yo";

/** Cabeceras de una petición. */
export type Cabeceras = Readonly<Record<string, string>>;

/** Firma mínima de `fetch` que usa el cliente; inyectable en pruebas. */
export interface TipoFetchCache {
  (url: string, inicio: RequestInit): Promise<Response>;
}

/** Opciones de `peticion`. */
export interface OpcionesPeticion {
  /** Cabeceras extra, por ejemplo una `Authorization` explícita. */
  cabeceras?: Cabeceras;
  /** Cuerpo que se serializa a JSON. */
  cuerpo?: object;
  /** Sustituto de `globalThis.fetch` (pruebas). */
  fetchImpl?: TipoFetchCache;
  /** `false` desactiva el refresh, aun en ruta autenticada (R5). */
  permitirRefresh?: boolean;
}

/** Resultado de `refrescarTokens()`: unión discriminada, nunca lanza. */
export type ResultadoRefresh = { ok: true; sesion: Sesion } | { ok: false; error: ApiError };

/** Estado interno de un intento. */
interface Intento {
  reintentado: boolean;
}

/** Contexto de una petición autenticada. */
interface Contexto {
  autenticada: boolean;
  fetchImpl: TipoFetchCache;
  metodo: string;
  opciones: OpcionesPeticion;
  ruta: string;
}

/** `globalThis.fetch`, resuelto en cada llamada para respetar los mocks. */
function fetchPorDefecto(): TipoFetchCache {
  return globalThis.fetch;
}

/** Une la base (sin barra final) con una ruta relativa. */
function construirUrl(base: string, ruta: string): string {
  if (ruta.startsWith("/")) {
    return `${base}${ruta}`;
  }
  return `${base}/${ruta}`;
}

/** URL base validada; si falta o es insegura se traduce a `ApiError`. */
function urlBase(): string {
  try {
    return obtenerApiUrl();
  } catch {
    throw errorSinRespuesta("configuracion");
  }
}

function esExito(respuesta: Response): boolean {
  if (respuesta.status < 200) {
    return false;
  }
  return respuesta.status < 300;
}

/** Cuerpo ya leído, en la forma laxa que acepta Zod. */
async function leerCuerpo(respuesta: Response): Promise<object | null> {
  try {
    return await leerJson(respuesta);
  } catch {
    return null;
  }
}

/** `res.json()` tipado a mano: lo externo lo valida Zod después. */
async function leerJson(respuesta: Response): Promise<object | null> {
  const cuerpo: object | null = await respuesta.json();
  return cuerpo;
}

/** `true` si `AbortController` cortó la petición por tiempo. */
function esTiempoAgotado(fallo: Error): boolean {
  return fallo.name === "AbortError";
}

/** Cualquier fallo atrapado → `ApiError` (respeta los que ya lo son). */
function errorDeFallo(fallo: Error): ApiError {
  if (fallo instanceof ApiError) {
    return fallo;
  }
  return errorSinRespuesta("desconocido");
}

/** Un intento de red con `AbortController`; traduce el fallo a `ApiError`. */
async function ejecutar(
  url: string,
  inicio: RequestInit,
  fetchImpl: TipoFetchCache,
): Promise<Response> {
  const control = new AbortController();
  const temporizador = globalThis.setTimeout(() => {
    control.abort();
  }, MS_TIEMPO_LIMITE);
  try {
    return await fetchImpl(url, { ...inicio, signal: control.signal });
  } catch (fallo) {
    if (!(fallo instanceof Error)) {
      throw errorSinRespuesta("red");
    }
    if (esTiempoAgotado(fallo)) {
      throw errorSinRespuesta("tiempo");
    }
    throw errorSinRespuesta("red");
  } finally {
    globalThis.clearTimeout(temporizador);
  }
}

/** Cabeceras + cuerpo JSON de una petición. */
function construirInicio(cabeceras: Cabeceras, cuerpo: object | undefined): RequestInit {
  const mapa: Record<string, string> = { Accept: "application/json" };
  if (cuerpo !== undefined) {
    mapa["Content-Type"] = "application/json";
  }
  for (const [nombre, valor] of Object.entries(cabeceras)) {
    mapa[nombre] = valor;
  }
  const inicio: RequestInit = { headers: mapa };
  if (cuerpo !== undefined) {
    inicio.body = JSON.stringify(cuerpo);
  }
  return inicio;
}

/** Tokens guardados; un fallo del almacén equivale a "sin sesión". */
async function leerTokensSeguro(): Promise<TokensGuardados | null> {
  try {
    return await leerTokens();
  } catch {
    return null;
  }
}

/** Borra tokens sin ocultar el error que provocó el cierre de sesión. */
async function borrarTokensSeguro(): Promise<void> {
  try {
    await borrarTokens();
  } catch {
    return;
  }
}

/** `Bearer` si la ruta es autenticada y hay token guardado. */
function conAutorizacion(
  cabeceras: Cabeceras,
  autenticada: boolean,
  tokens: TokensGuardados | null,
): Cabeceras {
  if (!autenticada) {
    return cabeceras;
  }
  if (tokens === null) {
    return cabeceras;
  }
  return { ...cabeceras, Authorization: `Bearer ${tokens.token}` };
}

/** Valida el cuerpo de una respuesta de éxito con Zod (R6). */
async function validarCuerpo<T>(respuesta: Response, esquema: z.ZodType<T>): Promise<T> {
  const candidato = await leerCuerpo(respuesta);
  const lectura = esquema.safeParse(candidato);
  if (!lectura.success) {
    throw errorDeValidacion(respuesta.status);
  }
  return lectura.data;
}

/** Respuesta no-2xx → `ApiError` con estado, motivo y `detalles` si los hay. */
async function errorDesdeRespuesta(respuesta: Response): Promise<ApiError> {
  const candidato = await leerCuerpo(respuesta);
  return errorDeRespuesta(respuesta.status, candidato);
}

/** `true` si un `401` debe intentar un único refresh y un único reintento. */
function debeRefrescar(ctx: Contexto, estado: number, intento: Intento): boolean {
  if (estado !== 401) {
    return false;
  }
  if (!ctx.autenticada) {
    return false;
  }
  if (ctx.opciones.permitirRefresh === false) {
    return false;
  }
  if (intento.reintentado) {
    return false;
  }
  return ctx.ruta !== RUTA_REFRESH;
}

/** Pide un refresh; si sale bien repite la petición original una vez. */
async function reintentarConSesionNueva<T>(ctx: Contexto, esquema: z.ZodType<T>): Promise<T> {
  const refresco = await refrescarTokens(ctx.fetchImpl);
  if (!refresco.ok) {
    await borrarTokensSeguro();
    throw new ApiError("autorizacion", 401);
  }
  return ejecutarPeticion(ctx, esquema, { reintentado: true });
}

/** Una petición (con o sin `Bearer`) que respeta R5. */
async function ejecutarPeticion<T>(
  ctx: Contexto,
  esquema: z.ZodType<T>,
  intento: Intento,
): Promise<T> {
  const tokens = await leerTokensSeguro();
  const cabeceras = conAutorizacion(ctx.opciones.cabeceras ?? {}, ctx.autenticada, tokens);
  const inicio = construirInicio(cabeceras, ctx.opciones.cuerpo);
  const url = construirUrl(urlBase(), ctx.ruta);
  const respuesta = await ejecutar(url, { ...inicio, method: ctx.metodo }, ctx.fetchImpl);
  if (esExito(respuesta)) {
    return validarCuerpo(respuesta, esquema);
  }
  if (!debeRefrescar(ctx, respuesta.status, intento)) {
    throw await errorDesdeRespuesta(respuesta);
  }
  return reintentarConSesionNueva(ctx, esquema);
}

/**
 * Petición HTTP contra la API.
 *
 * @param metodo `GET`, `POST`, `PUT`, `DELETE`.
 * @param ruta Relativa, por ejemplo `/api/health`.
 * @param opciones Cuerpo, cabeceras, refresh y `fetch` inyectable.
 * @param esquema Esquema Zod del cuerpo de la respuesta.
 * @param autenticada `true` en rutas privadas: añade `Bearer` y habilita R5.
 *
 * @throws ApiError con mensaje en español; nunca con el cuerpo crudo.
 */
export async function peticion<T>(
  metodo: string,
  ruta: string,
  opciones: OpcionesPeticion,
  esquema: z.ZodType<T>,
  autenticada: boolean = false,
): Promise<T> {
  const ctx: Contexto = {
    autenticada,
    fetchImpl: opciones.fetchImpl ?? fetchPorDefecto(),
    metodo,
    opciones,
    ruta,
  };
  return ejecutarPeticion(ctx, esquema, { reintentado: false });
}

/** `GET /api/auth/yo` con el `token` recién recibido (sin pasar por R5). */
async function usuarioDesdeYo(token: string, fetchImpl: TipoFetchCache): Promise<Usuario> {
  const inicio = construirInicio({ Authorization: `Bearer ${token}` }, undefined);
  const url = construirUrl(urlBase(), RUTA_YO);
  const respuesta = await ejecutar(url, { ...inicio, method: "GET" }, fetchImpl);
  if (!esExito(respuesta)) {
    throw await errorDesdeRespuesta(respuesta);
  }
  const cuerpo = await validarCuerpo(respuesta, RespuestaYoSchema);
  return cuerpo.usuario;
}

function sesionCon(cuerpo: z.infer<typeof RespuestaAuthSchema>, usuario: Usuario): Sesion {
  return {
    token: cuerpo.token,
    refresh_token: cuerpo.refreshToken,
    expira_en_seg: cuerpo.expiraEnSeg,
    usuario,
  };
}

/**
 * Convierte una respuesta de auth (ya validada) en `Sesion`.
 *
 * Si no trae `usuario`, lo completa con `GET /api/auth/yo` usando el token
 * recién recibido (el del refresh).
 */
export async function sesionDeRespuesta(
  cuerpo: z.infer<typeof RespuestaAuthSchema>,
  fetchImpl: TipoFetchCache,
): Promise<Sesion> {
  if (cuerpo.usuario !== undefined) {
    return sesionCon(cuerpo, cuerpo.usuario);
  }
  const usuario = await usuarioDesdeYo(cuerpo.token, fetchImpl);
  return sesionCon(cuerpo, usuario);
}

/** Valida la respuesta del refresh y guarda el par de tokens nuevo. */
async function guardarRefresco(
  respuesta: Response,
  fetchImpl: TipoFetchCache,
): Promise<ResultadoRefresh> {
  const candidato = await leerCuerpo(respuesta);
  const lectura = RespuestaAuthSchema.safeParse(candidato);
  if (!lectura.success) {
    return { ok: false, error: errorDeValidacion(respuesta.status) };
  }
  const cuerpo = lectura.data;
  try {
    await guardarTokens({ token: cuerpo.token, refresh_token: cuerpo.refreshToken });
  } catch {
    return { ok: false, error: new ApiError("desconocido", respuesta.status) };
  }
  try {
    const sesion = await sesionDeRespuesta(cuerpo, fetchImpl);
    return { ok: true, sesion };
  } catch (fallo) {
    if (!(fallo instanceof Error)) {
      return { ok: false, error: errorSinRespuesta("desconocido") };
    }
    return { ok: false, error: errorDeFallo(fallo) };
  }
}

/**
 * Renueva la sesión: `POST /api/auth/refresh` con el refresh token guardado.
 *
 * Sin `Authorization`; valida con `RespuestaAuthSchema`; guarda los tokens
 * nuevos y devuelve la `Sesion`. Si falla, **no** borra tokens: eso lo decide
 * quien llama (R5). El `401` del propio refresh no dispara otro refresh.
 */
export async function refrescarTokens(
  fetchImpl: TipoFetchCache = fetchPorDefecto(),
): Promise<ResultadoRefresh> {
  const base = urlBaseSinLanzar();
  if (base === null) {
    return { ok: false, error: errorSinRespuesta("configuracion") };
  }
  const tokens = await leerTokensSeguro();
  if (tokens === null) {
    return { ok: false, error: new ApiError("autorizacion", 401) };
  }
  const cuerpo = { refreshToken: tokens.refresh_token };
  const inicio = construirInicio({}, cuerpo);
  try {
    const respuesta = await ejecutar(
      construirUrl(base, RUTA_REFRESH),
      { ...inicio, method: "POST" },
      fetchImpl,
    );
    if (!esExito(respuesta)) {
      return { ok: false, error: await errorDesdeRespuesta(respuesta) };
    }
    return await guardarRefresco(respuesta, fetchImpl);
  } catch (fallo) {
    if (!(fallo instanceof Error)) {
      return { ok: false, error: errorSinRespuesta("desconocido") };
    }
    return { ok: false, error: errorDeFallo(fallo) };
  }
}

/** URL base o `null` si la configuración es inválida. */
function urlBaseSinLanzar(): string | null {
  try {
    return urlBase();
  } catch {
    return null;
  }
}
