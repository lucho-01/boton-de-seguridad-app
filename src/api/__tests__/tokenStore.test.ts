/**
 * Spec M0 · R4 (`src/api/tokenStore.ts`).
 *
 * `expo-secure-store` está simulado en memoria por `jest.setup.mocks.cjs` y se
 * vacía entre pruebas (`jest.setup.cjs`). Aquí se comprueba que se guarda, se
 * lee y se borra, y que las únicas claves son `token` y `refreshToken`: los
 * tokens nunca pasan por `AsyncStorage`.
 */

import * as SecureStore from "expo-secure-store";

import {
  CLAVE_REFRESH_TOKEN,
  CLAVE_TOKEN,
  borrarTokens,
  guardarTokens,
  leerTokens,
} from "../tokenStore";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const store = require("../../../jest.setup.secretStore.cjs") as {
  clavesGuardadas: () => string[];
};

const TOKENS = { token: "token-de-prueba-1", refresh_token: "refresh-de-prueba-2" };

describe("tokenStore · R4 guardado en expo-secure-store", () => {
  it("usa exactamente las claves `token` y `refreshToken`", () => {
    expect(CLAVE_TOKEN).toBe("token");
    expect(CLAVE_REFRESH_TOKEN).toBe("refreshToken");
  });

  it("guarda ambos tokens con las claves del contrato", async () => {
    await guardarTokens(TOKENS);
    expect(store.clavesGuardadas().sort()).toEqual(["refreshToken", "token"]);
    expect(await SecureStore.getItemAsync("token")).toBe(TOKENS.token);
    expect(await SecureStore.getItemAsync("refreshToken")).toBe(TOKENS.refresh_token);
  });

  it("lee el par guardado con el refresco en snake_case", async () => {
    await guardarTokens(TOKENS);
    expect(await leerTokens()).toEqual(TOKENS);
  });

  it("lee null cuando no hay nada guardado", async () => {
    expect(await leerTokens()).toBeNull();
  });

  it("lee null si falta uno de los dos tokens", async () => {
    await SecureStore.setItemAsync("token", TOKENS.token);
    expect(await leerTokens()).toBeNull();
  });

  it("lee null si un token está vacío", async () => {
    await SecureStore.setItemAsync("token", "");
    await SecureStore.setItemAsync("refreshToken", TOKENS.refresh_token);
    expect(await leerTokens()).toBeNull();
  });

  it("borra los dos tokens", async () => {
    await guardarTokens(TOKENS);
    await borrarTokens();
    expect(await leerTokens()).toBeNull();
    expect(store.clavesGuardadas()).toEqual([]);
  });

  it("borrar sin tokens guardados no falla", async () => {
    await expect(borrarTokens()).resolves.toBeUndefined();
  });

  it("sobrescribe el par anterior al guardar de nuevo", async () => {
    await guardarTokens(TOKENS);
    const nuevos = { token: "token-de-prueba-3", refresh_token: "refresh-de-prueba-4" };
    await guardarTokens(nuevos);
    expect(await leerTokens()).toEqual(nuevos);
    expect(store.clavesGuardadas().sort()).toEqual(["refreshToken", "token"]);
  });

  it("no guarda nada en AsyncStorage: solo hay dos claves y ambas del secure store", async () => {
    await guardarTokens(TOKENS);
    expect(store.clavesGuardadas()).toHaveLength(2);
    const claves: string[] = store.clavesGuardadas();
    for (const clave of claves) {
      expect(await SecureStore.getItemAsync(clave)).not.toBeNull();
    }
  });
});
