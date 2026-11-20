/**
 * Spec M9 · render de la pantalla con batería (`app/(tabs)/index.tsx`).
 *
 * Se mockea el módulo de controladores para inyectar un controlador falso,
 * así que no se toca SQLite ni la API. `expo-router` se simula para navegar
 * sin efectos secundarios. `expo-battery` se mockea para controlar la
 * disponibilidad de batería.
 *
 * Criterios de aceptación M9:
 * 1. Se lee el nivel de batería y se muestra en pantalla durante la cuenta.
 * 4. No hay batería disponible → no se muestra porcentaje pero la cuenta sigue.
 */

import { act, render, screen } from "@testing-library/react-native";
import * as Battery from "expo-battery";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("expo-battery", () => ({
  __esModule: true,
  isBatteryEnabledAsync: jest.fn(async () => true),
  getBatteryLevelAsync: jest.fn(async () => ({ batteryLevel: 0.84 })),
}));

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("react-native-gesture-handler", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const gestoVacio = { noop: true };
  return {
    __esModule: true,
    GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
    GestureDetector: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
    useLongPressGesture: () => gestoVacio,
    usePanGesture: () => ({ noop: true }),
  };
});

/** Variable capturada dentro del factory de jest.mock para @/controllers. */
let mockUseArmadoController: jest.Mock;

jest.mock("@/controllers", () => ({
  __esModule: true,
  useArmadoController: (mockUseArmadoController = jest.fn()),
}));

import PantallaAlerta from "../app/(tabs)/index";

const mockGetBatteryLevel = jest.mocked(Battery.getBatteryLevelAsync);

const METRICAS_SEGURAS = {
  frame: { x: 0, y: 0, width: 430, height: 932 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

type ControladorFalso = {
  estado: string;
  progreso: number;
  restanteSegundos: number;
  bateria: { porcentaje: number | null; disponible: boolean };
  iniciar: jest.Mock;
  cancelar: jest.Mock;
  armarConBoton: jest.Mock;
  volverAlInicio: jest.Mock;
  obtenerBateria: jest.Mock;
};

function construirControlador(sobreescritos: Partial<ControladorFalso> = {}): ControladorFalso {
  return {
    estado: "idle",
    progreso: 0,
    restanteSegundos: 5,
    bateria: { porcentaje: 84, disponible: true },
    iniciar: jest.fn(),
    cancelar: jest.fn(),
    armarConBoton: jest.fn(),
    volverAlInicio: jest.fn(),
    obtenerBateria: jest.fn(async () => ({ porcentaje: 84, disponible: true })),
    ...sobreescritos,
  };
}

async function abrirPantalla(ctl: ControladorFalso): Promise<void> {
  mockUseArmadoController.mockReturnValue(ctl);
  await render(
    <SafeAreaProvider initialMetrics={METRICAS_SEGURAS}>
      <PantallaAlerta />
    </SafeAreaProvider>,
  );
  await act(async () => {});
}

describe("Pantalla SOS · batería durante la cuenta", () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: Date.UTC(2026, 10, 14, 10, 0, 0),
      doNotFake: ["nextTick", "queueMicrotask"],
    });
    mockGetBatteryLevel.mockClear();
    mockUseArmadoController.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("muestra el porcentaje de batería durante la cuenta", async () => {
    const ctl = construirControlador({
      estado: "countdown",
      restanteSegundos: 4,
    });

    await abrirPantalla(ctl);

    expect(screen.getByText("Batería: 84%")).toBeOnTheScreen();
  });

  it("muestra el porcentaje de batería en estado lista", async () => {
    const ctl = construirControlador({
      estado: "lista",
      restanteSegundos: 0,
    });

    await abrirPantalla(ctl);

    expect(screen.getByText("Batería: 84%")).toBeOnTheScreen();
  });

  it("no muestra porcentaje cuando no hay batería disponible", async () => {
    const ctl = construirControlador({
      estado: "countdown",
      restanteSegundos: 4,
      bateria: { porcentaje: null, disponible: false },
    });

    await abrirPantalla(ctl);

    expect(screen.queryByText(/Batería:/)).toBeNull();
  });

  it("el botón alternativo expone rol y etiqueta accesibles", async () => {
    const ctl = construirControlador({
      estado: "idle",
    });

    await abrirPantalla(ctl);

    const boton = screen.getByTestId("boton-armar-alternativo");
    expect(boton.props.accessibilityRole).toBe("button");
    expect(boton.props.accessibilityLabel).toBeDefined();
  });
});
