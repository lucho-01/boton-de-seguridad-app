/**
 * Specs M2 y M3 · render de la pestaña «Alerta» (`app/(tabs)/index.tsx`).
 *
 * Controlador real con tiempo falso. Solo se sustituye el gesto de pulsación
 * larga de Gesture Handler (la alternativa accesible es un `Pressable` normal,
 * que se prueba con `fireEvent.press`). El resto de hardware ya está simulado
 * por `jest.setup` (secure store, gesture handler) o por el stub de Reanimated.
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

jest.mock("expo-haptics", () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  impactAsync: jest.fn(async () => undefined),
}));

jest.mock("react-native-gesture-handler", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  /** El gesto no se ejecuta: la pantalla se relega al botón alternativo. */
  const gestoVacio = { noop: true };
  return {
    __esModule: true,
    GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
    GestureDetector: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
    useLongPressGesture: () => gestoVacio,
    usePanGesture: () => gestoVacio,
  };
});

import PantallaAlerta from "../app/(tabs)/index";
import { TEXTO_AVISO_123 } from "@/components/AvisoLinea123";
import {
  ContenidoArmado,
  ETIQUETA_VOLVER,
  TEXTO_CUENTA_TERMINADA,
  TEXTO_REPOSO,
} from "@/components/ContenidoArmado";
import { ETIQUETA_CANCELAR } from "@/components/CuentaRegresiva";
import { MS_ARMADO } from "@/services/armadoSos";
import { MS_CUENTA } from "@/services/cuentaRegresiva";

const TESTID_ALTERNATIVO = "boton-armar-alternativo";

beforeEach(() => {
  jest.useFakeTimers({
    now: Date.UTC(2026, 10, 14, 10, 0, 0),
    doNotFake: ["nextTick", "queueMicrotask"],
  });
  jest.mocked(Haptics.impactAsync).mockImplementation(async () => undefined);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

/** Monta la pantalla y deja asentar el sondeo de háptica del controlador. */
async function abrirPantalla(): Promise<
  ReturnType<typeof render> extends Promise<infer V> ? V : never
> {
  const vista = await render(<PantallaAlerta />);
  await act(async () => {});
  return vista;
}

/** Pulsa un elemento accesible de la pantalla dentro de `act`. */
async function pulsar(elemento: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    await fireEvent.press(elemento);
  });
}

/** Avanza el reloj falso dentro de `act`. */
async function avanzar(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe("Pantalla SOS · R7 el aviso 123 sigue visible", () => {
  it("muestra el aviso permanente al abrir", async () => {
    await abrirPantalla();

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
  });

  it("arranca en reposo con su texto y el botón alternativo", async () => {
    await abrirPantalla();

    expect(screen.getByText(TEXTO_REPOSO)).toBeOnTheScreen();
    expect(screen.getByTestId(TESTID_ALTERNATIVO)).toBeOnTheScreen();
    expect(screen.queryByLabelText(ETIQUETA_CANCELAR)).toBeNull();
  });
});

describe("Pantalla SOS · alternativa accesible", () => {
  it("una pulsación en el botón alternativo arranca la cuenta de 5 s", async () => {
    await abrirPantalla();

    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    expect(screen.getByText("Alerta en 5 s")).toBeOnTheScreen();
    expect(screen.getByLabelText(ETIQUETA_CANCELAR)).toBeOnTheScreen();
  });

  it("no hace falta esperar 3 s: la cuenta arranca con la pulsación", async () => {
    await abrirPantalla();
    expect(jest.now()).toBe(Date.UTC(2026, 10, 14, 10, 0, 0));

    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    expect(jest.now()).toBe(Date.UTC(2026, 10, 14, 10, 0, 0));
    expect(screen.getByText("Alerta en 5 s")).toBeOnTheScreen();
  });

  it("mientras corre la cuenta el aviso 123 sigue visible", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
  });

  it("el botón SOS expone su etiqueta accesible y el progreso en reposo", async () => {
    await abrirPantalla();

    expect(screen.getByTestId("boton-sos")).toBeOnTheScreen();
    expect(screen.getByText("Mantén presionado: 0 %")).toBeOnTheScreen();
  });
});

describe("Pantalla SOS · cuenta regresiva", () => {
  it("muestra el número restante y el progreso de la cuenta", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    await avanzar(MS_CUENTA / 2);

    expect(screen.getAllByText(/Alerta en 3 s/).length).toBeGreaterThan(0);
  });

  it("el texto de la cuenta aparece una sola vez (sin duplicados accesibles)", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    expect(screen.getAllByText("Alerta en 5 s")).toHaveLength(1);
  });

  it("el bloque de la cuenta no es una live region: no repite el anuncio", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    const parrafo = screen.getByText("Puedes cancelar la alerta deslizando o con el botón.");
    expect(parrafo.parent?.props.accessibilityLiveRegion).toBeUndefined();
  });

  it("al terminar los 5 s muestra «Cuenta terminada» y «Volver al inicio»", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    await avanzar(MS_CUENTA);

    expect(screen.getByText(new RegExp(TEXTO_CUENTA_TERMINADA))).toBeOnTheScreen();
    expect(screen.getByLabelText(ETIQUETA_VOLVER)).toBeOnTheScreen();
    expect(screen.queryByLabelText(ETIQUETA_CANCELAR)).toBeNull();
  });

  it("«Volver al inicio» devuelve la pantalla al reposo", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));
    await avanzar(MS_CUENTA);

    await pulsar(screen.getByLabelText(ETIQUETA_VOLVER));

    expect(screen.getByText(TEXTO_REPOSO)).toBeOnTheScreen();
    expect(screen.queryByLabelText(ETIQUETA_VOLVER)).toBeNull();
  });
});

describe("Pantalla SOS · cancelar la cuenta", () => {
  it("«Cancelar la alerta» vuelve al estado de reposo", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    await pulsar(screen.getByLabelText(ETIQUETA_CANCELAR));

    expect(screen.getByText(TEXTO_REPOSO)).toBeOnTheScreen();
    expect(screen.queryByLabelText(ETIQUETA_CANCELAR)).toBeNull();
  });

  it("tras cancelar se puede volver a armar con el botón", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));
    await pulsar(screen.getByLabelText(ETIQUETA_CANCELAR));

    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));

    expect(screen.getByText("Alerta en 5 s")).toBeOnTheScreen();
  });

  it("el aviso 123 sigue visible después de cancelar", async () => {
    await abrirPantalla();
    await pulsar(screen.getByTestId(TESTID_ALTERNATIVO));
    await pulsar(screen.getByLabelText(ETIQUETA_CANCELAR));

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
  });
});

describe("Pantalla SOS · constante del armado", () => {
  it("el gesto y el botón usan el mismo umbral de la spec", () => {
    expect(MS_ARMADO).toBe(3000);
  });
});

describe("Pantalla SOS · el avance no se repite", () => {
  it("durante el armado el porcentaje solo aparece en el texto del botón SOS", async () => {
    await render(
      <ContenidoArmado
        estado="arming"
        onVolverAlInicio={jest.fn()}
        ubicacion={null}
        ubicacionFallida={false}
      />,
    );

    expect(screen.getByText("Armando alerta…")).toBeOnTheScreen();
    expect(screen.queryByText(/Armando alerta….*%/)).toBeNull();
    expect(screen.queryByText(/Mantén presionado:/)).toBeNull();
  });
});
