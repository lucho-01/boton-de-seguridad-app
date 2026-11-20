/**
 * Tokens de la sesión (spec M0 · R4).
 *
 * Solo `expo-secure-store`: nunca `AsyncStorage`, nunca en logs. El estado de
 * sesión (usuario, expiración) vive en `src/controllers/`; aquí solo hay dos
 * cadenas.
 */
import * as SecureStore from "expo-secure-store";

/** Claves fijas del contrato de almacenamiento (R4). */
export const CLAVE_TOKEN = "token";
export const CLAVE_REFRESH_TOKEN = "refreshToken";

/** Par de tokens tal como lo devuelve `/api/auth/*` (camelCase en el cable). */
export interface TokensGuardados {
  token: string;
  refresh_token: string;
}

/**
 * Guarda ambos tokens.
 *
 * El refresh va primero: si falla a mitad, nunca queda un `token` nuevo con un
 * refresh viejo, que llevaría a cerrar sesión en el siguiente `401`.
 */
export async function guardarTokens(tokens: TokensGuardados): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_REFRESH_TOKEN, tokens.refresh_token);
  await SecureStore.setItemAsync(CLAVE_TOKEN, tokens.token);
}

/** Lee el par de tokens; `null` si falta cualquiera de los dos o está vacío. */
export async function leerTokens(): Promise<TokensGuardados | null> {
  const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
  const refreshToken = await SecureStore.getItemAsync(CLAVE_REFRESH_TOKEN);
  if (!esTokenUtil(token) || !esTokenUtil(refreshToken)) {
    return null;
  }
  return { token, refresh_token: refreshToken };
}

/** Borra ambos tokens (cierre de sesión o refresh fallido). */
export async function borrarTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  await SecureStore.deleteItemAsync(CLAVE_REFRESH_TOKEN);
}

function esTokenUtil(valor: string | null): valor is string {
  if (valor === null) {
    return false;
  }
  return valor.length > 0;
}
