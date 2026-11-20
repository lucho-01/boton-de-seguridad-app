/**
 * Spec M9 · pruebas del controlador con batería y vibración por segundo.
 *
 * `src/controllers/useArmadoController.ts` implementa `bateria` y
 * `obtenerBateria()` (M9 R1, R5), y `useVibracionCuenta` vibra cada segundo
 * durante la cuenta regresiva (M9 R2).
 *
 * Tiempo falso, `renderHook`, `expo-haptics` mockeado, `expo-battery` mockeado.
 */

import { act, renderHook, type RenderHookResult } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import * as Battery from "expo-battery";
import { AccessibilityInfo } from "react-native";

jest.mock("expo-haptics", () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  impactAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-battery", () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(async () => true),
  getBatteryLevelAsync: jest.fn(async () => 0.84),
}));

import { useArmadoController, type ArmadoController } from "@/controllers";
import { MS_ARMADO } from "@/services/armadoSos";
import { MS_CUENTA } from "@/services/cuentaRegresiva";

const mockImpacto = jest.mocked(Haptics.impactAsync);
const mockIsBatteryEnabled = jest.mocked(Battery.isAvailableAsync);
const mockGetBatteryLevel = jest.mocked(Battery.getBatteryLevelAsync);

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
  // useBateria() actualiza el estado de forma asíncrona (varios await);
  // vaciar hasta que se estabilice.
  for (let i = 0; i < 50; i++) {
    await act(async () => {});
    const bateria = vista.result.current.bateria;
    if (bateria.disponible && bateria.porcentaje !== null) {
      break;
    }
  }
  return vista;
}

async function armarConBoton(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.armarConBoton();
  });
}

async function obtenerBateria(
  vista: VistaDelArmado,
): Promise<{ porcentaje: number | null; disponible: boolean }> {
  return vista.result.current.obtenerBateria();
}

function vibracionesLight(): number {
  return mockImpacto.mock.calls.filter(([s]) => s === "light").length;
}

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date("2026-11-14T10:00:00.000Z"),
    doNotFake: ["nextTick", "queueMicrotask"],
  });
  mockImpacto.mockClear();
  mockImpacto.mockImplementation(async () => undefined);
  mockIsBatteryEnabled.mockClear();
  mockIsBatteryEnabled.mockResolvedValue(true);
  mockGetBatteryLevel.mockClear();
  mockGetBatteryLevel.mockResolvedValue(0.84);
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

describe("useArmadoController · batería: obtenerBateria()", () => {
  it("devuelve porcentaje cuando hay batería disponible", async () => {
    const vista = await montar();

    const bateria = await obtenerBateria(vista);

    expect(bateria.disponible).toBe(true);
    expect(bateria.porcentaje).toBe(84);
  });

  it("devuelve null cuando no hay batería disponible", async () => {
    mockIsBatteryEnabled.mockResolvedValue(false);

    const vista = await montar();

    const bateria = await obtenerBateria(vista);

    expect(bateria.disponible).toBe(false);
    expect(bateria.porcentaje).toBeNull();
  });
});

describe("useArmadoController · batería: vibración por segundo durante la cuenta", () => {
  it("no vibra antes de iniciar la cuenta", async () => {
    await montar();

    expect(vibracionesLight()).toBe(0);
  });

  it("vibra cada segundo durante la cuenta regresiva", async () => {
    const vista = await montar();
    const antes = vibracionesLight();

    await armarConBoton(vista);
    await avanzar(MS_ARMADO); // llega a countdown

    // Cada 1000 ms durante los 5 s de cuenta: 5 intervalos + 1 al iniciar
    await avanzar(5000);

    expect(vibracionesLight()).toBeGreaterThanOrEqual(antes + 5);
  });

  it("no vibra por segundo después de llegar a lista", async () => {
    const vista = await montar();

    await armarConBoton(vista);
    await avanzar(MS_ARMADO + MS_CUENTA); // llega a lista

    const vibracionesEnLista = vibracionesLight();
    await avanzar(MS_CUENTA); // más tiempo en lista

    expect(vista.result.current.estado).toBe("lista");
    expect(vibracionesLight()).toBe(vibracionesEnLista);
  });
});
