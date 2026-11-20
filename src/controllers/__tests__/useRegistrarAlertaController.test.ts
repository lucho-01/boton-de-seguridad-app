import { act, renderHook } from "@testing-library/react-native";

import { useRegistrarAlertaController } from "@/controllers/useRegistrarAlertaController";
import type { AlertasRepository } from "@/repositories/alertas";
import type { Alerta } from "@/models";

class AlertasEnMemoria implements AlertasRepository {
  guardadas: Alerta[] = [];

  async listar(): Promise<Alerta[]> {
    return this.guardadas;
  }

  async guardar(alerta: Alerta): Promise<void> {
    this.guardadas.push(alerta);
  }
}

describe("useRegistrarAlertaController · M12", () => {
  it("registra cancelación al volver a idle desde la cuenta", async () => {
    const repository = new AlertasEnMemoria();
    const vista = await renderHook(
      ({ estado }: { estado: "idle" | "arming" | "countdown" | "lista" }) =>
        useRegistrarAlertaController(
          {
            estado,
            ubicacion: null,
            ubicacionLista: true,
            bateriaPct: 72,
          },
          repository,
        ),
      { initialProps: { estado: "idle" as const } },
    );

    await act(async () => {
      vista.rerender({ estado: "countdown" });
    });
    await act(async () => {
      vista.rerender({ estado: "idle" });
    });

    expect(repository.guardadas).toHaveLength(1);
    expect(repository.guardadas[0].estado).toBe("cancelada");
    expect(repository.guardadas[0].bateria_pct).toBe(72);
  });

  it("registra una sola alerta preparada al llegar a lista", async () => {
    const repository = new AlertasEnMemoria();
    const ubicacion = { lat: 4.71, lng: -74.07, precision: 10 };
    const vista = await renderHook(
      ({ coords, ubicacionLista }: { coords: typeof ubicacion | null; ubicacionLista: boolean }) =>
        useRegistrarAlertaController(
          {
            estado: "lista",
            ubicacion: coords,
            ubicacionLista,
            bateriaPct: 84,
          },
          repository,
        ),
      { initialProps: { coords: null, ubicacionLista: false } },
    );

    await act(async () => {
      vista.rerender({ coords: ubicacion, ubicacionLista: true });
    });

    expect(repository.guardadas).toHaveLength(1);
    expect(repository.guardadas[0].estado).toBe("mensaje_preparado");
    expect(repository.guardadas[0].lat).toBe(4.71);
  });
});
