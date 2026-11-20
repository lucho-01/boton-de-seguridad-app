/**
 * Único módulo que lee `EXPO_PUBLIC_API_URL` (spec M0 · R1–R3).
 *
 * La URL no es un secreto, pero queda dentro del APK: solo se guarda la base
 * de la API. `resolverApiUrl` es pura para poder probarla sin `process.env`.
 */

/** Variable pública de Expo. */
const VARIABLE_URL = "EXPO_PUBLIC_API_URL";

/** URL válida y normalizada (sin barras finales). */
export interface UrlValida {
  ok: true;
  url: string;
}

/** La URL falta o es insegura fuera de desarrollo. */
export interface UrlInvalida {
  ok: false;
  motivo: "faltante" | "insegura";
}

/** Resultado discriminado de `resolverApiUrl`: nunca lanza. */
export type ResultadoUrl = UrlValida | UrlInvalida;

/**
 * Lee la variable en cada llamada (no al cargar el módulo): así las pruebas
 * pueden fijarla con `jest.replaceProperty` y la app refleja el valor real.
 */
function leerVariable(): string | undefined {
  return process.env[VARIABLE_URL];
}

/**
 * Normaliza y valida una URL base.
 *
 * - Vacía o solo espacios → `faltante` (R2).
 * - Fuera de desarrollo debe ser `https://` y no apuntar a `localhost` ni a
 *   `127.0.0.1` → si no, `insegura` (R3). En desarrollo se acepta `http://`
 *   para poder probar contra una API local.
 * - Se quitan todas las barras finales (R1).
 */
export function resolverApiUrl(valor: string | undefined, esDesarrollo: boolean): ResultadoUrl {
  const limpia = quitarBarrasFinales(recortar(valor));
  if (limpia === "") {
    return { ok: false, motivo: "faltante" };
  }
  if (esDesarrollo) {
    return { ok: true, url: limpia };
  }
  if (!esHttpsSegura(limpia)) {
    return { ok: false, motivo: "insegura" };
  }
  return { ok: true, url: limpia };
}

/**
 * URL base de la API para la app en ejecución.
 *
 * `esDesarrollo` se inyecta en las pruebas; por defecto, `__DEV__` de Metro.
 *
 * @throws Error con mensaje en español si la URL falta o es insegura.
 */
export function obtenerApiUrl(esDesarrollo: boolean = esDesarrolloActual()): string {
  const resultado = resolverApiUrl(leerVariable(), esDesarrollo);
  if (!resultado.ok) {
    throw new Error(mensajeDeConfiguracion(resultado.motivo));
  }
  return resultado.url;
}

/** Valor de `__DEV__` del entorno de Metro (declarado en `entorno.d.ts`). */
function esDesarrolloActual(): boolean {
  return __DEV__;
}

/** Mensaje legible para la persona (spec §7). */
function mensajeDeConfiguracion(motivo: UrlInvalida["motivo"]): string {
  if (motivo === "faltante") {
    return "Falta configurar el servidor.";
  }
  return "La dirección del servidor no es segura.";
}

function recortar(valor: string | undefined): string {
  if (valor === undefined) {
    return "";
  }
  return valor.trim();
}

function quitarBarrasFinales(valor: string): string {
  return valor.replace(/\/+$/, "");
}

/**
 * `https://` y un host que no resuelva a la propia máquina.
 *
 * Se bloquea `localhost` y cualquier nombre bajo `.localhost`, `0.0.0.0`,
 * `::1` y todo IPv4 de 127.0.0.0/8. Una URL que `new URL` no acepta también
 * cuenta como insegura.
 */
function esHttpsSegura(url: string): boolean {
  let analizada: URL;
  try {
    analizada = new URL(url);
  } catch {
    return false;
  }
  if (analizada.protocol !== "https:") {
    return false;
  }
  return !esHostLocal(normalizarHost(analizada.hostname));
}

/** `::1` llega entre corchetes (`[::1]`): se quitan antes de comparar. */
function normalizarHost(hostname: string): string {
  const minusculas = hostname.toLowerCase();
  if (minusculas.startsWith("[") && minusculas.endsWith("]")) {
    return minusculas.slice(1, -1);
  }
  return minusculas;
}

function esHostLocal(host: string): boolean {
  if (host === "localhost") {
    return true;
  }
  if (host.endsWith(".localhost")) {
    return true;
  }
  // Nombre que empieza por `localhost.` (p. ej. `localhost.ejemplo.com`).
  if (host.startsWith("localhost.")) {
    return true;
  }
  if (host === "0.0.0.0") {
    return true;
  }
  if (host === "::1") {
    return true;
  }
  return esIpv4Loopback(host);
}

/** 127.0.0.0/8: el primer octeto es 127 y los otros tres son válidos. */
function esIpv4Loopback(host: string): boolean {
  const octetos = host.split(".");
  if (octetos.length !== 4) {
    return false;
  }
  if (octetos[0] !== "127") {
    return false;
  }
  const resto = octetos.slice(1);
  for (const octeto of resto) {
    if (!esOcteto(octeto)) {
      return false;
    }
  }
  return true;
}

function esOcteto(valor: string): boolean {
  if (!/^\d{1,3}$/.test(valor)) {
    return false;
  }
  const numero = Number(valor);
  if (numero > 255) {
    return false;
  }
  return true;
}
