/**
 * Spec M8 · pruebas del controlador con ubicación al terminar la cuenta.
 *
 * `src/controllers/useArmadoController.ts` declara `ubicacion` y
 * `obtenerUbicacion()` en su interfaz, pero el hook actual no los implementa
 * en su retorno (brecha de producción pendiente del agente `data`).
 * Este test cubre lo que sí está implementado: `iniciarPorSacudida()`.
 *
 * Tiempo falso, `renderHook`, `expo-haptics` mockeado y espía de anuncios.
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

async function iniciarPorSacudida(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.iniciarPorSacudida();
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

describe("useArmadoController · ubicación: iniciarPorSacudida", () => {
  it("iniciarPorSacudida() desde idle arranca el armado y anuncia", async () => {
    const vista = await montar();

    await iniciarPorSacudida(vista);

    expect(vista.result.current.estado).toBe("arming");
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });

  it("iniciarPorSacudida() desde countdown no reinicia ni anuncia de nuevo", async () => {
    const vista = await montar();
    await act(async () => {
      vista.result.current.iniciar();
    });
    await avanzar(MS_ARMADO + 1000);

    await iniciarPorSacudida(vista);
    await avanzar(1000);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.restanteSegundos).toBe(3);
    expect(textosAnunciados()).toHaveLength(1);
  });

  it("iniciarPorSacudida() desde lista no reinicia ni anuncia de nuevo", async () => {
    const vista = await montar();
    await act(async () => {
      vista.result.current.iniciar();
    });
    await avanzar(MS_ARMADO + MS_CUENTA);

    await iniciarPorSacudida(vista);
    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("lista");
    expect(textosAnunciados()).toHaveLength(1);
  });
});
