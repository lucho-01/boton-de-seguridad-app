import { act, renderHook } from "@testing-library/react-native";

import { ApiError } from "@/api";
import { CuentaSincronizacionDiferenteError, sincronizarDatos } from "@/sync/sincronizar";
import { useSincronizacionController } from "@/controllers/useSincronizacionController";

jest.mock("@/sync/sincronizar", () => ({
  __esModule: true,
  CuentaSincronizacionDiferenteError: class CuentaSincronizacionDiferenteError extends Error {},
  sincronizarDatos: jest.fn(async () => undefined),
}));

describe("useSincronizacionController · M14", () => {
  beforeEach(() => {
    jest.mocked(sincronizarDatos).mockReset();
  });

  it("no intenta sincronizar sin una sesión", async () => {
    const vista = await renderHook(() => useSincronizacionController(null));

    await act(async () => {
      await vista.result.current.sincronizar();
    });

    expect(vista.result.current.estado).toBe("sin_sesion");
    expect(sincronizarDatos).not.toHaveBeenCalled();
  });

  it("expone éxito después de completar la sincronización", async () => {
    jest.mocked(sincronizarDatos).mockResolvedValue(undefined);
    const vista = await renderHook(() => useSincronizacionController("usuario-1"));

    await act(async () => {
      await vista.result.current.sincronizar();
    });

    expect(sincronizarDatos).toHaveBeenCalledWith("usuario-1");
    expect(vista.result.current.estado).toBe("sincronizado");
    expect(vista.result.current.mensaje).toBe("Contactos y alertas sincronizados.");
  });

  it("muestra el error de cuenta vinculada sin contactar a otra cuenta", async () => {
    jest.mocked(sincronizarDatos).mockRejectedValue(new CuentaSincronizacionDiferenteError());
    const vista = await renderHook(() => useSincronizacionController("usuario-2"));

    await act(async () => {
      await vista.result.current.sincronizar();
    });

    expect(vista.result.current.estado).toBe("cuenta_diferente");
    expect(vista.result.current.mensaje).toContain("vinculado a otra cuenta");
  });

  it("muestra el mensaje seguro del cliente HTTP en caso de error", async () => {
    jest.mocked(sincronizarDatos).mockRejectedValue(new ApiError("red", null));
    const vista = await renderHook(() => useSincronizacionController("usuario-1"));

    await act(async () => {
      await vista.result.current.sincronizar();
    });

    expect(vista.result.current.estado).toBe("error");
    expect(vista.result.current.mensaje).toBe("Sin conexión con el servidor.");
  });

  it("reusa el trabajo en curso y permite esperar antes del cierre de sesión", async () => {
    let terminar: (() => void) | null = null;
    jest.mocked(sincronizarDatos).mockImplementation(
      () =>
        new Promise<void>((resolver) => {
          terminar = resolver;
        }),
    );
    const vista = await renderHook(() => useSincronizacionController("usuario-1"));
    let espera: Promise<void> | null = null;

    await act(async () => {
      const primero = vista.result.current.sincronizar();
      const segundo = vista.result.current.sincronizar();
      espera = vista.result.current.esperar();
      expect(sincronizarDatos).toHaveBeenCalledTimes(1);
      terminar?.();
      await Promise.all([primero, segundo, espera]);
    });

    expect(vista.result.current.estado).toBe("sincronizado");
  });
});
