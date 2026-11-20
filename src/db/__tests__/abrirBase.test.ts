import { openDatabaseSync } from "expo-sqlite";

import { abrirBase } from "@/db/abrirBase";

jest.mock("expo-sqlite", () => ({
  __esModule: true,
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(async () => undefined),
  })),
}));

describe("abrirBase · migraciones M13", () => {
  it("reutiliza una sola base y crea las tablas de dominio", async () => {
    const primera = await abrirBase();
    const segunda = await abrirBase();

    expect(segunda).toBe(primera);
    expect(openDatabaseSync).toHaveBeenCalledTimes(1);
    expect(primera.execAsync).toHaveBeenCalledTimes(4);
    expect(primera.execAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS contacto_confianza"),
    );
    expect(primera.execAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS alerta"),
    );
    expect(primera.execAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("CHECK (estado IN ('cancelada', 'mensaje_preparado'))"),
    );
  });
});
