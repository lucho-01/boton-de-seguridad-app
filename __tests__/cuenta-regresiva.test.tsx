/**
 * Spec M3 · gesto de cancelar de `CuentaRegresiva`.
 *
 * El gesto real no corre en Jest, así que se captura la configuración que la
 * vista entrega a `usePanGesture` y se invocan sus callbacks con un
 * `translationX` concreto: el umbral de la spec es 96 px (95 no cancela).
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";

/** Fragmento de la configuración del pan que usa la vista. */
interface ConfigPan {
  onDeactivate?: (evento: { translationX: number }) => void;
  onUpdate?: (evento: { translationX: number }) => void;
}

jest.mock("react-native-gesture-handler", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    GestureDetector: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
    usePanGesture: (config: unknown) => {
      (globalThis as { __configPan?: unknown }).__configPan = config;
      return { noop: true };
    },
  };
});

import {
  CuentaRegresiva,
  ETIQUETA_CANCELAR,
  PISTA_CANCELAR,
  UMBRAL_CANCELAR,
} from "@/components/CuentaRegresiva";

/** Configuración capturada del gesto; falla si la vista no la entregó. */
function configuracionDelGesto(): ConfigPan {
  const capturada = (globalThis as { __configPan?: ConfigPan }).__configPan;
  if (capturada === undefined) {
    throw new Error("La vista no configuró el gesto de deslizar");
  }
  return capturada;
}

/** Suelta el gesto con el desplazamiento indicado, dentro de `act`. */
async function soltarEn(translationX: number): Promise<void> {
  await act(async () => {
    configuracionDelGesto().onDeactivate?.({ translationX });
  });
}

describe("CuentaRegresiva · gesto de cancelar", () => {
  it("el umbral de la spec es 96 px", () => {
    expect(UMBRAL_CANCELAR).toBe(96);
  });

  it("deslizar 95 px no cancela", async () => {
    const onCancelar = jest.fn();
    await render(<CuentaRegresiva restanteSegundos={5} onCancelar={onCancelar} />);

    await soltarEn(95);

    expect(onCancelar).not.toHaveBeenCalled();
  });

  it("deslizar 96 px cancela", async () => {
    const onCancelar = jest.fn();
    await render(<CuentaRegresiva restanteSegundos={5} onCancelar={onCancelar} />);

    await soltarEn(96);

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("el botón «Cancelar la alerta» es la alternativa accesible al gesto", async () => {
    const onCancelar = jest.fn();
    await render(<CuentaRegresiva restanteSegundos={5} onCancelar={onCancelar} />);

    await act(async () => {
      await fireEvent.press(screen.getByLabelText("Cancelar la alerta"));
    });

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("muestra los segundos restantes una sola vez y sin live region", async () => {
    await render(<CuentaRegresiva restanteSegundos={4} onCancelar={jest.fn()} />);

    const textos = screen.getAllByText(/Alerta en 4 s/);
    expect(textos).toHaveLength(1);
    expect(textos[0].props.accessibilityLiveRegion).toBeUndefined();
    expect(screen.queryByText(/Progreso:/)).toBeNull();
  });

  it("la pista del botón describe su propia acción, no el gesto", async () => {
    await render(<CuentaRegresiva restanteSegundos={5} onCancelar={jest.fn()} />);

    const boton = screen.getByLabelText(ETIQUETA_CANCELAR);
    expect(boton.props.accessibilityHint).toBe(PISTA_CANCELAR);
    expect(boton.props.accessibilityHint).not.toContain("Desliza");
  });

  it("el control de deslizar queda oculto al lector de pantalla, con sus textos", async () => {
    await render(<CuentaRegresiva restanteSegundos={5} onCancelar={jest.fn()} />);

    /* Oculto de verdad: ni la consulta por testID lo encuentra por defecto. */
    expect(screen.queryByTestId("deslizar-cancelar")).toBeNull();
    expect(screen.queryByText("Desliza para cancelar")).toBeNull();
    expect(screen.queryByText("→→")).toBeNull();

    const control = screen.getByTestId("deslizar-cancelar", { includeHiddenElements: true });
    expect(control.props.accessible).toBe(false);
    expect(control.props.accessibilityElementsHidden).toBe(true);
    expect(control.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
