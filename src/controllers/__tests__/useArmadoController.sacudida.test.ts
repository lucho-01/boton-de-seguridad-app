/**
 * Spec M7 · pruebas del controlador con sacudida triple.
 *
 * `src/controllers/useArmadoController.ts` ya incluye `iniciarPorSacudida()`
 * (M7 R2 y R6): solo arranca desde `idle`, llama a `iniciar()` y anuncia
 * «Cuenta regresiva iniciada`. Mientras hay cuenta en curso no reinicia.
 *
 * Patrón idéntico a `src/controllers/__tests__/useArmadoController.test.tsx`:
 * tiempo falso, `renderHook`, `expo-haptics` mockeado y espía de anuncios.
 */

import { act, renderHook, type RenderHookResult } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { AccessibilityInfo } from "react-native";

jest.mock("expo-haptics", () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  impactAsync: jest.fn(async () => undefined),
}));

import { ANUNCIO_CUENTA, useArmadoController, type ArmadoController } from "@/controllers";
import { MS_ARMADO } from "@/services/armadoSos";
import { MS_CUENTA } from "@/services/cuentaRegresiva";

const mockImpacto = jest.mocked(Haptics.impactAsync);

type VistaDelArmado = RenderHookResult<ArmadoController, object>;

let anuncios: jest.SpyInstance<void, [string, number?]> | null = null;
let vistaAbierta: VistaDelArmado | null = null;

async function avanzar(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function montar(): Promise<VistaDelArmado> {
  const vista = await renderHook(() => useArmadoController());
  vistaAbierta = vista;
  await act(async () => {});
  return vista;
}

async function iniciar(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.iniciar();
  });
}

async function iniciarPorSacudida(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.iniciarPorSacudida();
  });
}

async function armarConBoton(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.armarConBoton();
  });
}

async function cancelar(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.cancelar();
  });
}

function textosAnunciados(): string[] {
  return anuncios?.mock.calls.map(([texto]) => texto) ?? [];
}

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date("2026-11-14T10:00:00.000Z"),
    doNotFake: ["nextTick", "queueMicrotask"],
  });
  mockImpacto.mockClear();
  mockImpacto.mockImplementation(async () => undefined);
  anuncios = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  anuncios.mockImplementation(() => undefined);
});

afterEach(async () => {
  const vista = vistaAbierta;
  vistaAbierta = null;
  if (vista !== null) {
    await vista.unmount();
  }
  anuncios?.mockRestore();
  anuncios = null;
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("useArmadoController · sacudida: iniciar desde idle", () => {
  it("iniciar() desde idle pasa a arming y vibra al empezar", async () => {
    const vista = await montar();
    const lucesAntes = mockImpacto.mock.calls.filter(([s]) => s === "light").length;

    await iniciar(vista);

    expect(vista.result.current.estado).toBe("arming");
    expect(mockImpacto.mock.calls.filter(([s]) => s === "light").length).toBe(lucesAntes + 1);
  });

  it("el progreso avanza con los timers hasta completar el armado", async () => {
    const vista = await montar();
    await iniciar(vista);

    await avanzar(MS_ARMADO / 2);

    expect(vista.result.current.estado).toBe("arming");
    expect(vista.result.current.progreso).toBe(0.5);
  });

  it("a 3000 ms pasa a countdown con el anuncio de inicio de cuenta", async () => {
    const vista = await montar();
    await iniciar(vista);

    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("countdown");
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });
});

describe("useArmadoController · sacudida: iniciarPorSacudida (M7)", () => {
  it("iniciarPorSacudida() desde idle arranca el armado y anuncia", async () => {
    const vista = await montar();

    await iniciarPorSacudida(vista);

    expect(vista.result.current.estado).toBe("arming");
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });

  it("iniciarPorSacudida() desde countdown no reinicia ni anuncia de nuevo", async () => {
    const vista = await montar();
    await iniciar(vista);
    await avanzar(MS_ARMADO + 1000);

    await iniciarPorSacudida(vista);
    await avanzar(1000);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.restanteSegundos).toBe(3);
    expect(textosAnunciados()).toHaveLength(1);
  });

  it("iniciarPorSacudida() desde lista no reinicia ni anuncia de nuevo", async () => {
    const vista = await montar();
    await iniciar(vista);
    await avanzar(MS_ARMADO + MS_CUENTA);

    await iniciarPorSacudida(vista);
    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("lista");
    expect(textosAnunciados()).toHaveLength(1);
  });
});

describe("useArmadoController · sacudida: no reinicia durante cuenta en curso (R3)", () => {
  it("iniciar() desde countdown no reinicia la cuenta ni repite el anuncio", async () => {
    const vista = await montar();
    await iniciar(vista);
    await avanzar(MS_ARMADO + 1000);

    await iniciar(vista);
    await avanzar(1000);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.restanteSegundos).toBe(3);
    expect(textosAnunciados()).toHaveLength(1);
  });

  it("iniciar() desde lista no vuelve a contar ni repite el anuncio", async () => {
    const vista = await montar();
    await iniciar(vista);
    await avanzar(MS_ARMADO + MS_CUENTA);

    await iniciar(vista);
    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("lista");
    expect(textosAnunciados()).toHaveLength(1);
  });

  it("armarConBoton() durante arming no adelanta el armado", async () => {
    const vista = await montar();
    await iniciar(vista);
    await avanzar(500);

    await armarConBoton(vista);

    expect(vista.result.current.estado).toBe("arming");
    expect(textosAnunciados()).toEqual([]);
  });
});

describe("useArmadoController · sacudida: alternativa accesible armarConBoton", () => {
  it("armarConBoton() desde idle arranca directo la cuenta de 5 s", async () => {
    const vista = await montar();

    await armarConBoton(vista);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.progreso).toBe(0);
    expect(vista.result.current.restanteSegundos).toBe(MS_CUENTA / 1000);
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });

  it("la cuenta del botón llega a lista tras 5000 ms", async () => {
    const vista = await montar();

    await armarConBoton(vista);
    await avanzar(MS_CUENTA);

    expect(vista.result.current.estado).toBe("lista");
    expect(vista.result.current.progreso).toBe(1);
  });

  it("tras cancelar se puede volver a armar con el botón alternativo", async () => {
    const vista = await montar();
    await armarConBoton(vista);
    await cancelar(vista);

    expect(vista.result.current.estado).toBe("idle");

    await armarConBoton(vista);

    expect(vista.result.current.estado).toBe("countdown");
  });
});
