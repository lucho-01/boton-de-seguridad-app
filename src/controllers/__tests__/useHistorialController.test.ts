import { act, renderHook } from "@testing-library/react-native";

import { useHistorialController } from "@/controllers/useHistorialController";
import type { AlertasRepository } from "@/repositories/alertas";
import type { Alerta } from "@/models";

class AlertasEnMemoria implements AlertasRepository {
  constructor(private readonly datos: Alerta[]) {}

  async listar(): Promise<Alerta[]> {
    return this.datos;
  }

  async guardar(): Promise<void> {
    return;
  }
}

const ALERTA: Alerta = {
  id: "00000000-0000-4000-8000-000000000001",
  remote_id: null,
  created_at: "2026-11-20T22:00:00.000Z",
  updated_at: "2026-11-20T22:00:00.000Z",
  deleted_at: null,
  pending: 1,
  deleted: 0,
  lat: null,
  lng: null,
  precision_m: null,
  bateria_pct: null,
  estado: "cancelada",
  creada_en: "2026-11-20T22:00:00.000Z",
};

describe("useHistorialController · M12", () => {
  it("carga alertas mediante el repositorio", async () => {
    const repository = new AlertasEnMemoria([ALERTA]);
    const vista = await renderHook(() => useHistorialController(repository));

    await act(async () => {
      await vista.result.current.refrescar();
    });

    expect(vista.result.current.alertas).toEqual([ALERTA]);
    expect(vista.result.current.cargando).toBe(false);
    expect(vista.result.current.aviso).toBeNull();
  });

  it("muestra un aviso cuando falla la carga", async () => {
    const repository: AlertasRepository = {
      listar: async () => {
        throw new Error("error sqlite");
      },
      guardar: async () => undefined,
    };
    const vista = await renderHook(() => useHistorialController(repository));

    await act(async () => {
      await vista.result.current.refrescar();
    });

    expect(vista.result.current.aviso).toContain("No se pudo cargar");
  });
});
