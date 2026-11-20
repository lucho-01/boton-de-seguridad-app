import type {
  SQLiteBindParams,
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from "expo-sqlite";

import type { ContactoConfianza } from "@/services/contactos";
import { ContactosRepositorySqlite } from "@/repositories/contactos";

const AHORA = new Date("2026-11-20T22:00:00.000Z");

function repositorioConBase(filas: ContactoConfianza[] = []) {
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
  const repositorio = new ContactosRepositorySqlite(Promise.resolve(base));
  return { repositorio, getAllAsync, runAsync };
}

describe("ContactosRepositorySqlite · M13", () => {
  it("lista y consulta contactos activos con parámetros", async () => {
    const contacto: ContactoConfianza = {
      id: "contacto-1",
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: "Madre",
      remote_id: null,
      created_at: AHORA.toISOString(),
      updated_at: AHORA.toISOString(),
      deleted_at: null,
      pending: 1,
      deleted: 0,
      principal: 0,
    };
    const { repositorio, getAllAsync } = repositorioConBase([contacto]);

    await expect(repositorio.listar()).resolves.toEqual([contacto]);
    await expect(repositorio.obtenerPorId(contacto.id)).resolves.toEqual(contacto);
    expect(getAllAsync.mock.calls[1][0]).toContain("WHERE id = ? AND deleted = 0");
    expect(getAllAsync.mock.calls[1][1]).toEqual([contacto.id]);
  });

  it("lista todos los pendientes, incluidos los borrados", async () => {
    const { repositorio, getAllAsync } = repositorioConBase();

    await repositorio.listarPendientes();

    expect(getAllAsync.mock.calls[0][0]).toContain("WHERE pending = 1");
    expect(getAllAsync.mock.calls[0][0]).toContain("ORDER BY updated_at, id");
  });

  it("guarda con SQL parametrizado", async () => {
    const { repositorio, runAsync } = repositorioConBase();
    const contacto = {
      id: "contacto-1",
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: "Madre",
      remote_id: null,
      created_at: AHORA.toISOString(),
      updated_at: AHORA.toISOString(),
      deleted_at: null,
      pending: 1,
      deleted: 0,
      principal: 0,
    };

    await repositorio.guardar(contacto);

    expect(runAsync.mock.calls[0][0]).toContain("INSERT OR REPLACE INTO contacto_confianza");
    expect(runAsync.mock.calls[0][1]).toEqual([
      contacto.id,
      contacto.nombre,
      contacto.telefono,
      contacto.parentesco,
      contacto.remote_id,
      contacto.created_at,
      contacto.updated_at,
      contacto.deleted_at,
      contacto.pending,
      contacto.deleted,
      contacto.principal,
    ]);
  });

  it("aplica el borrado lógico en lugar de DELETE físico", async () => {
    const { repositorio, runAsync } = repositorioConBase();

    await repositorio.marcarBorrado("contacto-1", AHORA);

    expect(runAsync.mock.calls[0][0]).toContain("SET deleted = 1, deleted_at = ?, pending = 1");
    expect(runAsync.mock.calls[0][0]).not.toMatch(/DELETE\s+FROM/i);
    expect(runAsync.mock.calls[0][1]).toEqual([
      AHORA.toISOString(),
      AHORA.toISOString(),
      "contacto-1",
    ]);
  });

  it("marca principal de forma atómica y pendiente de sincronización", async () => {
    const { repositorio, runAsync } = repositorioConBase();

    await repositorio.marcarPrincipal("contacto-1", AHORA);

    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(runAsync.mock.calls[0][0]).toContain("CASE WHEN id = ? THEN 1 ELSE 0 END");
    expect(runAsync.mock.calls[0][0]).toContain("pending = 1");
    expect(runAsync.mock.calls[0][0]).toContain("AND (id = ? OR principal = 1)");
    expect(runAsync.mock.calls[0][1]).toEqual([
      "contacto-1",
      AHORA.toISOString(),
      "contacto-1",
      "contacto-1",
    ]);
  });

  it("aplica registros remotos con protección por versión", async () => {
    const { repositorio, runAsync } = repositorioConBase();
    const contacto: ContactoConfianza = {
      id: "contacto-1",
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: "Madre",
      remote_id: "contacto-1",
      created_at: AHORA.toISOString(),
      updated_at: AHORA.toISOString(),
      deleted_at: null,
      pending: 0,
      deleted: 0,
      principal: 1,
    };

    await repositorio.guardarDesdeApi(contacto);

    expect(runAsync.mock.calls[0][0]).toContain("ON CONFLICT(id) DO UPDATE");
    expect(runAsync.mock.calls[0][0]).toContain(
      "excluded.updated_at > contacto_confianza.updated_at",
    );
    expect(runAsync.mock.calls[0][1]).toContain(contacto.id);
  });

  it("confirma la subida con control de versión local", async () => {
    const { repositorio, runAsync } = repositorioConBase();
    const contacto: ContactoConfianza = {
      id: "contacto-1",
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: "Madre",
      remote_id: "contacto-1",
      created_at: AHORA.toISOString(),
      updated_at: AHORA.toISOString(),
      deleted_at: null,
      pending: 0,
      deleted: 0,
      principal: 1,
    };

    await repositorio.confirmarSubida(contacto, "2026-11-20T21:59:00.000Z");

    expect(runAsync.mock.calls[0][0]).toContain("WHERE id = ? AND updated_at = ? AND pending = 1");
    expect(runAsync.mock.calls[0][1]).toContain("2026-11-20T21:59:00.000Z");
  });
});
