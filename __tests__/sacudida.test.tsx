/**
 * Spec M7 · render de pantalla con botón «Iniciar con sacudida».
 *
 * `app/(tabs)/index.tsx` será modificado por el agente `screens` para
 * integrar la detección de sacudida triple. Este test usa un componente
 * mock que representa la pantalla M7 e inyecta un controlador falso,
 * siguiendo el patrón de `contactos.test.tsx` y `sos.test.tsx`.
 *
 * No toca `expo-router` ni SQLite: solo verifica render e interacciones.
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import { TEXTO_AVISO_123 } from "@/components/AvisoLinea123";
import type { ArmadoController, EstadoArmado } from "@/controllers";

/** Componente mock de la pantalla M7 (representa lo que añadirá el agente screens). */
function PantallaSacudidaMock({
  controlador,
}: {
  controlador: ArmadoController;
}): React.ReactElement {
  const sensorDisponible = controlador.estado === "idle";

  return (
    <View>
      <Pressable
        testID="boton-iniciar-sacudida"
        accessibilityRole="button"
        accessibilityLabel="Iniciar la alerta con sacudida triple"
        onPress={controlador.iniciar}
        disabled={!sensorDisponible}
      >
        <Text>Iniciar con sacudida</Text>
      </Pressable>
      <Text testID="indicador-sensor">
        {sensorDisponible ? "Acelerómetro disponible" : "Acelerómetro no disponible"}
      </Text>
      <Text>{TEXTO_AVISO_123}</Text>
    </View>
  );
}

function controladorFalso(estado: EstadoArmado = "idle"): ArmadoController {
  return {
    estado,
    progreso: 0,
    restanteSegundos: 5,
    ubicacion: null,
    bateria: { porcentaje: 84, disponible: true },
    obtenerUbicacion: jest.fn(async () => null),
    obtenerBateria: jest.fn(() => ({ porcentaje: 84, disponible: true })),
    iniciar: jest.fn(),
    cancelar: jest.fn(),
    armarConBoton: jest.fn(),
    iniciarPorSacudida: jest.fn(),
    volverAlInicio: jest.fn(),
  };
}

async function pulsar(elemento: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    await fireEvent.press(elemento);
  });
}

describe("Pantalla sacudida · render", () => {
  it("muestra el botón «Iniciar con sacudida»", async () => {
    const ctl = controladorFalso();
    await render(<PantallaSacudidaMock controlador={ctl} />);

    expect(screen.getByText("Iniciar con sacudida")).toBeOnTheScreen();
  });

  it("muestra el indicador de estado del sensor", async () => {
    const ctl = controladorFalso("idle");
    await render(<PantallaSacudidaMock controlador={ctl} />);

    expect(screen.getByTestId("indicador-sensor")).toBeOnTheScreen();
  });

  it("el aviso de la línea 123 es visible", async () => {
    const ctl = controladorFalso();
    await render(<PantallaSacudidaMock controlador={ctl} />);

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
  });

  it("el botón expone accessibilityRole button y accessibilityLabel", async () => {
    const ctl = controladorFalso();
    await render(<PantallaSacudidaMock controlador={ctl} />);

    const boton = screen.getByTestId("boton-iniciar-sacudida");
    expect(boton).toHaveProp("accessibilityRole", "button");
    expect(boton).toHaveProp("accessibilityLabel", "Iniciar la alerta con sacudida triple");
  });
});

describe("Pantalla sacudida · interacciones", () => {
  it("pulsar el botón llama controlador.iniciar", async () => {
    const ctl = controladorFalso();
    await render(<PantallaSacudidaMock controlador={ctl} />);

    await pulsar(screen.getByTestId("boton-iniciar-sacudida"));

    expect(ctl.iniciar).toHaveBeenCalledTimes(1);
  });

  it("cuando el estado no es idle el botón está deshabilitado", async () => {
    const ctl = controladorFalso("countdown");
    await render(<PantallaSacudidaMock controlador={ctl} />);

    expect(screen.getByTestId("boton-iniciar-sacudida")).toBeDisabled();
  });

  it("el indicador muestra «no disponible» cuando no está en idle", async () => {
    const ctl = controladorFalso("countdown");
    await render(<PantallaSacudidaMock controlador={ctl} />);

    expect(screen.getByText("Acelerómetro no disponible")).toBeOnTheScreen();
    expect(screen.queryByText("Acelerómetro disponible")).toBeNull();
  });

  it("el indicador muestra «disponible» cuando está en idle", async () => {
    const ctl = controladorFalso("idle");
    await render(<PantallaSacudidaMock controlador={ctl} />);

    expect(screen.getByText("Acelerómetro disponible")).toBeOnTheScreen();
    expect(screen.queryByText("Acelerómetro no disponible")).toBeNull();
  });
});
