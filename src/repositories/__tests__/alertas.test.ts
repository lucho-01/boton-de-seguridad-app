import type {
  SQLiteBindParams,
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from "expo-sqlite";

import type { Alerta } from "@/models";
import { AlertasRepositorySqlite } from "@/repositories/alertas";

const AHORA = new Date("2026-11-20T22:00:00.000Z");
const ALERTA: Alerta = {
  id: "00000000-0000-4000-8000-000000000001",
  remote_id: null,
  created_at: AHORA.toISOString(),
  updated_at: AHORA.toISOString(),
  deleted_at: null,
  pending: 1,
  deleted: 0,
  lat: 4.71,
  lng: -74.07,
  precision_m: 12,
  bateria_pct: 84,
  estado: "mensaje_preparado",
  creada_en: AHORA.toISOString(),
};

function repositorioConBase(filas: Alerta[] = []) {
  const getAllAsync = jest.fn(
    async <T>(query: string, ...params: (SQLiteBindParams | SQLiteBindValue)[]): Promise<T[]> => {
      void query;
      void params;
      return filas as T[];
    },
  );
  const runAsync = jest.fn(
    async (
      query: string,
      ...params: (SQLiteBindParams | SQLiteBindValue)[]
    ): Promise<SQLiteRunResult> => {
      void query;
      void params;
      return { changes: 1, lastInsertRowId: 1 };
    },
  );
  const base: Pick<SQLiteDatabase, "getAllAsync" | "runAsync"> = { getAllAsync, runAsync };
  const repositorio = new AlertasRepositorySqlite(Promise.resolve(base));
  return { repositorio, getAllAsync, runAsync };
}

describe("AlertasRepositorySqlite · M13", () => {
  it("lista solo las alertas activas en orden descendente", async () => {
    const { repositorio, getAllAsync } = repositorioConBase([ALERTA]);

    await expect(repositorio.listar()).resolves.toEqual([ALERTA]);
    expect(getAllAsync.mock.calls[0][0]).toContain("WHERE deleted = 0");
    expect(getAllAsync.mock.calls[0][0]).toContain("ORDER BY creada_en DESC");
  });

  it("devuelve una alerta activa por id", async () => {
    const { repositorio } = repositorioConBase([ALERTA]);

    await expect(repositorio.obtenerPorId(ALERTA.id)).resolves.toEqual(ALERTA);
  });

  it("lista todos los pendientes, incluidos los borrados", async () => {
    const { repositorio, getAllAsync } = repositorioConBase([ALERTA]);

    await repositorio.listarPendientes();

    expect(getAllAsync.mock.calls[0][0]).toContain("WHERE pending = 1");
    expect(getAllAsync.mock.calls[0][0]).toContain("ORDER BY updated_at, id");
  });

  it("obtiene por id con parámetro y devuelve null si no existe", async () => {
    const { repositorio, getAllAsync } = repositorioConBase();

    await expect(repositorio.obtenerPorId(ALERTA.id)).resolves.toBeNull();
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND deleted = 0"),
      [ALERTA.id],
    );
  });

  it("guarda los campos sincronizables con SQL parametrizado", async () => {
    const { repositorio, runAsync } = repositorioConBase();

    await repositorio.guardar(ALERTA);

    expect(runAsync.mock.calls[0][0]).toContain("INSERT OR REPLACE INTO alerta");
    expect(runAsync.mock.calls[0][0]).toContain("VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    expect(runAsync.mock.calls[0][1]).toEqual([
      ALERTA.id,
      ALERTA.remote_id,
      ALERTA.created_at,
      ALERTA.updated_at,
      ALERTA.deleted_at,
      ALERTA.pending,
      ALERTA.deleted,
      ALERTA.lat,
      ALERTA.lng,
      ALERTA.precision_m,
      ALERTA.bateria_pct,
      ALERTA.estado,
      ALERTA.creada_en,
    ]);
  });

  it("marca borrado lógico y deja la alerta pendiente de sincronización", async () => {
    const { repositorio, runAsync } = repositorioConBase();

    await repositorio.marcarBorrado(ALERTA.id, AHORA);

    expect(runAsync.mock.calls[0][0]).toContain("SET deleted = 1, deleted_at = ?, pending = 1");
    expect(runAsync.mock.calls[0][1]).toEqual([
      AHORA.toISOString(),
      AHORA.toISOString(),
      ALERTA.id,
    ]);
  });

  it("aplica registros remotos con protección por versión", async () => {
    const { repositorio, runAsync } = repositorioConBase();
    const sincronizada = { ...ALERTA, remote_id: ALERTA.id, pending: 0 };

    await repositorio.guardarDesdeApi(sincronizada);

    expect(runAsync.mock.calls[0][0]).toContain("ON CONFLICT(id) DO UPDATE");
    expect(runAsync.mock.calls[0][0]).toContain("excluded.updated_at > alerta.updated_at");
    expect(runAsync.mock.calls[0][1]).toContain(ALERTA.id);
  });

  it("confirma la subida solo si la fila conserva la versión enviada", async () => {
    const { repositorio, runAsync } = repositorioConBase();
    const sincronizada = { ...ALERTA, remote_id: ALERTA.id, pending: 0 };

    await repositorio.confirmarSubida(sincronizada, "2026-11-20T21:59:00.000Z");

    expect(runAsync.mock.calls[0][0]).toContain("WHERE id = ? AND updated_at = ? AND pending = 1");
    expect(runAsync.mock.calls[0][1]).toContain("2026-11-20T21:59:00.000Z");
  });
});
