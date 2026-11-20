/**
 * Botón SOS de M2 y M3 · acción accesible por lector de pantalla.
 *
 * En `idle` un doble toque arma; en `arming` cancela (observación de seguridad
 * de M2: el conteo no puede quedar sin salida accesible). El gesto de pulsación
 * larga se sustituye por un noop, como en `sos.test.tsx`.
 *
 * El doble toque se resuelve con `accessibilityActions` + `onAccessibilityAction`
 * (acción `activate`), que funciona igual en iOS y en Android: `onAccessibilityTap`
 * es solo de iOS y por eso no se usa.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";

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
  };
});

import {
  BotonSos,
  PISTA_BOTON_SOS,
  PISTA_SOS_ARMANDO,
  PISTA_SOS_CUENTA,
  PISTA_SOS_LISTA,
} from "@/components/BotonSos";
import {
  BotonAlternativoArmado,
  PISTA_BOTON_ALTERNATIVO,
} from "@/components/BotonAlternativoArmado";
import type { EstadoArmado } from "@/controllers";

/** Doble toque del lector de pantalla sobre el botón SOS. */
async function dobleToque(): Promise<void> {
  await fireEvent(screen.getByTestId("boton-sos"), "accessibilityAction", {
    nativeEvent: { actionName: "activate" },
  });
}

/** Monta el botón SOS en el estado indicado. */
async function montarEn(estado: EstadoArmado): Promise<void> {
  await render(
    <BotonSos estado={estado} progreso={0.5} onIniciar={jest.fn()} onCancelar={jest.fn()} />,
  );
}

/** Pista accesible declarada por el botón SOS montado. */
function pista(): string {
  return screen.getByTestId("boton-sos").props.accessibilityHint;
}

/** Etiqueta accesible declarada por el botón SOS montado. */
function etiqueta(): string {
  return screen.getByTestId("boton-sos").props.accessibilityLabel;
}

describe("BotonSos · acción accesible", () => {
  it("en reposo, el doble toque inicia el armado", async () => {
    const onIniciar = jest.fn();
    const onCancelar = jest.fn();
    await render(
      <BotonSos estado="idle" progreso={0} onIniciar={onIniciar} onCancelar={onCancelar} />,
    );

    await dobleToque();

    expect(onIniciar).toHaveBeenCalledTimes(1);
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it("mientras se arma, el doble toque cancela el conteo", async () => {
    const onIniciar = jest.fn();
    const onCancelar = jest.fn();
    await render(
      <BotonSos estado="arming" progreso={0.5} onIniciar={onIniciar} onCancelar={onCancelar} />,
    );

    await dobleToque();

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onIniciar).not.toHaveBeenCalled();
  });

  it("en cuenta regresiva el doble toque no cancela: eso es del botón (R6)", async () => {
    const onIniciar = jest.fn();
    const onCancelar = jest.fn();
    await render(
      <BotonSos estado="countdown" progreso={0.2} onIniciar={onIniciar} onCancelar={onCancelar} />,
    );

    await dobleToque();

    expect(onIniciar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it("lista: el doble toque no repite ninguna acción", async () => {
    const onIniciar = jest.fn();
    const onCancelar = jest.fn();
    await render(
      <BotonSos estado="lista" progreso={1} onIniciar={onIniciar} onCancelar={onCancelar} />,
    );

    await dobleToque();

    expect(onIniciar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });
});

describe("BotonSos · doble toque en Android", () => {
  it("expone la acción «activate» en reposo", async () => {
    await montarEn("idle");

    expect(screen.getByTestId("boton-sos").props.accessibilityActions).toEqual([
      { name: "activate", label: "Armar la alerta" },
    ]);
  });

  it("expone la acción «activate» mientras se arma (cancela)", async () => {
    await montarEn("arming");

    expect(screen.getByTestId("boton-sos").props.accessibilityActions).toEqual([
      { name: "activate", label: "Cancelar el armado" },
    ]);
  });

  it("no expone acciones durante la cuenta: cancela el botón (R6)", async () => {
    await montarEn("countdown");

    expect(screen.getByTestId("boton-sos").props.accessibilityActions).toEqual([]);
  });

  it("no expone acciones con la alerta lista", async () => {
    await montarEn("lista");

    expect(screen.getByTestId("boton-sos").props.accessibilityActions).toEqual([]);
  });
});

describe("BotonSos · pista accesible sin acciones muertas", () => {
  it("en reposo apunta al botón alternativo, que está disponible", async () => {
    await montarEn("idle");

    expect(pista()).toBe(PISTA_BOTON_SOS);
  });

  it("mientras se arma no manda al botón alternativo: está deshabilitado", async () => {
    await montarEn("arming");

    expect(pista()).toBe(PISTA_SOS_ARMANDO);
    expect(pista()).not.toContain("Armar la alerta con un botón");
  });

  it("durante la cuenta manda al botón «Cancelar la alerta»", async () => {
    await montarEn("countdown");

    expect(pista()).toBe(PISTA_SOS_CUENTA);
  });

  it("con la alerta lista manda al botón «Volver al inicio»", async () => {
    await montarEn("lista");

    expect(pista()).toBe(PISTA_SOS_LISTA);
  });
});

describe("BotonSos · etiqueta estable", () => {
  it("la etiqueta no cambia con el avance de la fase (no repite el anuncio)", async () => {
    await montarEn("arming");

    expect(etiqueta()).not.toContain("%");
  });

  it("durante la cuenta la etiqueta no lleva los segundos", async () => {
    await montarEn("countdown");

    expect(etiqueta()).toContain("cuenta regresiva");
    expect(etiqueta()).not.toMatch(/\d+ segundos/);
  });
});

describe("BotonAlternativoArmado · una sola activación", () => {
  it("una pulsación arma exactamente una vez", async () => {
    const onArmar = jest.fn();
    await render(<BotonAlternativoArmado onArmar={onArmar} disponible />);

    await fireEvent.press(screen.getByTestId("boton-armar-alternativo"));

    expect(onArmar).toHaveBeenCalledTimes(1);
  });

  it("deshabilitado no dispara la acción", async () => {
    const onArmar = jest.fn();
    await render(<BotonAlternativoArmado onArmar={onArmar} disponible={false} />);

    await fireEvent.press(screen.getByTestId("boton-armar-alternativo"));

    expect(onArmar).not.toHaveBeenCalled();
  });

  it("disponible, la pista explica el atajo de una pulsación", async () => {
    await render(<BotonAlternativoArmado onArmar={jest.fn()} disponible />);

    expect(screen.getByTestId("boton-armar-alternativo").props.accessibilityHint).toBe(
      PISTA_BOTON_ALTERNATIVO,
    );
  });

  it("deshabilitado, la pista no anuncia una acción que no se puede ejecutar", async () => {
    await render(<BotonAlternativoArmado onArmar={jest.fn()} disponible={false} />);

    expect(screen.getByTestId("boton-armar-alternativo").props.accessibilityHint).toBeUndefined();
  });
});
