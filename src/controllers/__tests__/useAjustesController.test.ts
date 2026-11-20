/**
 * Spec M6 · controlador de ajustes (`src/controllers/useAjustesController.ts`).
 *
 * El repositorio se inyecta como un doble en memoria: sin SQLite ni red.
 * Se prueba el controlador, no la base de datos.
 */

import { act, renderHook, type RenderHookResult } from "@testing-library/react-native";

import { useAjustesController, type AjustesController } from "@/controllers/useAjustesController";
import { type AjustesRepository } from "@/repositories/ajustes";
import { MENSAJE_AJUSTES_GUARDADOS, valoresPorDefecto } from "@/services/ajustes";

class RepositorioAjustesEnMemoria implements AjustesRepository {
  private valores: Map<string, string>;

  constructor(inicial: Map<string, string> = new Map()) {
    this.valores = new Map(inicial);
  }

  async obtenerClave(clave: string): Promise<string | null> {
    return this.valores.get(clave) ?? null;
  }

  async guardarClave(clave: string, valor: string): Promise<void> {
    this.valores.set(clave, valor);
  }

  obtenerGuardadas(): Map<string, string> {
    return new Map(this.valores);
  }
}

type VistaDelHook = RenderHookResult<AjustesController, object>;

async function montar(
  inicial: Map<string, string> = new Map(),
): Promise<{ vista: VistaDelHook; repositorio: RepositorioAjustesEnMemoria }> {
  const repositorio = new RepositorioAjustesEnMemoria(inicial);
  const vista = (await renderHook(() =>
    useAjustesController(repositorio),
  )) as unknown as VistaDelHook;
  return { vista, repositorio };
}

describe("useAjustesController", () => {
  it("arranca con valores por defecto si no hay nada guardado", async () => {
    const { vista } = await montar();
    await act(async () => {});

    expect(vista.result.current.cargando).toBe(false);
    expect(vista.result.current.ajustes).toEqual(valoresPorDefecto());
    expect(vista.result.current.puedeGuardar).toBe(false);
    expect(vista.result.current.aviso).toBeNull();
  });

  it("carga valores desde el repositorio", async () => {
    const inicial = new Map([
      ["umbral_sacudida", "20"],
      ["ventana_sacudida", "3000"],
      ["mensaje_base", "Mensaje guardado."],
    ]);
    const { vista } = await montar(inicial);
    await act(async () => {});

    expect(vista.result.current.ajustes).toEqual({
      umbralSacudida: 20,
      ventanaSacudida: 3000,
      mensajeBase: "Mensaje guardado.",
    });
    expect(vista.result.current.puedeGuardar).toBe(false);
  });

  it("actualizarMensajeBase acepta hasta 160 caracteres", async () => {
    const { vista } = await montar();
    await act(async () => {});

    const resultado = await vista.result.current.actualizarMensajeBase("a".repeat(160));
    await act(async () => {});

    expect(resultado.ok).toBe(true);
    expect(vista.result.current.ajustes.mensajeBase).toBe("a".repeat(160));
    expect(vista.result.current.puedeGuardar).toBe(true);
  });

  it("actualizarMensajeBase rechaza más de 160 sin cambiar el estado", async () => {
    const { vista } = await montar();
    await act(async () => {});

    const resultado = await vista.result.current.actualizarMensajeBase("a".repeat(161));
    await act(async () => {});

    expect(resultado.ok).toBe(false);
    expect(vista.result.current.ajustes.mensajeBase).toBe(valoresPorDefecto().mensajeBase);
    expect(vista.result.current.puedeGuardar).toBe(false);
  });

  it("actualizarSensibilidad rechaza umbral o ventana menor o igual a cero", async () => {
    const { vista } = await montar();
    await act(async () => {});

    await vista.result.current.actualizarSensibilidad(0, 2000);
    await act(async () => {});
    expect(vista.result.current.ajustes.umbralSacudida).toBe(15);
    expect(vista.result.current.ajustes.ventanaSacudida).toBe(2000);

    await vista.result.current.actualizarSensibilidad(15, 0);
    await act(async () => {});
    expect(vista.result.current.ajustes.umbralSacudida).toBe(15);
    expect(vista.result.current.ajustes.ventanaSacudida).toBe(2000);
  });

  it("restablecerValoresPorDefecto vuelve a los valores por defecto", async () => {
    const { vista } = await montar();
    await act(async () => {});

    await vista.result.current.actualizarMensajeBase("Mensaje cambiado.");
    await act(async () => {});
    expect(vista.result.current.ajustes.mensajeBase).toBe("Mensaje cambiado.");

    await vista.result.current.restablecerValoresPorDefecto();
    await act(async () => {});

    expect(vista.result.current.ajustes).toEqual(valoresPorDefecto());
    expect(vista.result.current.aviso).toBe("Ajustes restablecidos a los valores por defecto.");
  });

  it("guardar persiste en el repositorio y avisa", async () => {
    const { vista, repositorio } = await montar();
    await act(async () => {});

    await vista.result.current.actualizarMensajeBase("Mensaje nuevo.");
    await act(async () => {});
    expect(vista.result.current.puedeGuardar).toBe(true);

    await vista.result.current.guardar();
    await act(async () => {});

    expect(repositorio.obtenerGuardadas().get("mensaje_base")).toBe("Mensaje nuevo.");
    expect(vista.result.current.aviso).toBe(MENSAJE_AJUSTES_GUARDADOS);
    expect(vista.result.current.puedeGuardar).toBe(false);
  });
});
