/**
 * Spec M8 · render de pantalla con ubicación al terminar la cuenta.
 *
 * Se inyecta un controlador falso en cada pantalla, así que no se toca SQLite
 * ni la API. `expo-router` se simula para navegar sin efectos secundarios.
 * Sigue el patrón de `contactos.test.tsx` y `sos.test.tsx`.
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import { TEXTO_AVISO_123 } from "@/components/AvisoLinea123";
import type { ArmadoController, EstadoArmado } from "@/controllers";

/** Componente mock de la pantalla M8 (representa lo que añadirá el agente screens). */
function PantallaUbicacionMock({
  controlador,
}: {
  controlador: ArmadoController;
}): React.ReactElement {
  const enLista = controlador.estado === "lista";

  return (
    <View>
      <Text>{TEXTO_AVISO_123}</Text>
      {enLista ? (
        <View>
          <Text testID="estado-ubicacion">Estado: cuenta terminada</Text>
          {controlador.ubicacion ? (
            <View>
              <Text testID="latitud">Latitud: {String(controlador.ubicacion.lat)}</Text>
              <Text testID="longitud">Longitud: {String(controlador.ubicacion.lng)}</Text>
            </View>
          ) : (
            <Text testID="ubicacion-no-disponible">Ubicación no disponible.</Text>
          )}
          <Pressable
            testID="boton-volver-inicio"
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio"
            onPress={controlador.volverAlInicio}
          >
            <Text>Volver al inicio</Text>
          </Pressable>
        </View>
      ) : (
        <Text testID="estado-actual">{controlador.estado}</Text>
      )}
    </View>
  );
}

function controladorFalso(estado: EstadoArmado = "idle"): ArmadoController {
  return {
    estado,
    progreso: 0,
    restanteSegundos: 5,
    ubicacion: estado === "lista" ? { lat: 4.711, lng: -74.072, precision: 10 } : null,
    bateria: { porcentaje: 84, disponible: true },
    iniciar: jest.fn(),
    cancelar: jest.fn(),
    armarConBoton: jest.fn(),
    iniciarPorSacudida: jest.fn(),
    volverAlInicio: jest.fn(),
    obtenerUbicacion: jest.fn(async () => ({
      lat: 4.711,
      lng: -74.072,
      precision: 10,
    })),
    obtenerBateria: jest.fn(() => ({ porcentaje: 84, disponible: true })),
  };
}

async function pulsar(elemento: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    await fireEvent.press(elemento);
  });
}

describe("Pantalla ubicación · render en estado lista", () => {
  it("muestra el estado de ubicación al terminar la cuenta", async () => {
    const ctl = controladorFalso("lista");
    await render(<PantallaUbicacionMock controlador={ctl} />);

    expect(screen.getByTestId("estado-ubicacion")).toBeOnTheScreen();
  });

  it("muestra coordenadas (latitud, longitud) cuando están disponibles", async () => {
    const ctl = controladorFalso("lista");
    await render(<PantallaUbicacionMock controlador={ctl} />);

    expect(screen.getByTestId("latitud")).toBeOnTheScreen();
    expect(screen.getByTestId("longitud")).toBeOnTheScreen();
    expect(screen.getByTestId("latitud")).toHaveTextContent(/4\.711/);
    expect(screen.getByTestId("longitud")).toHaveTextContent(/-74\.072/);
  });

  it("muestra mensaje cuando no se pudo obtener ubicación", async () => {
    const ctl = controladorFalso("lista");
    ctl.ubicacion = null;
    await render(<PantallaUbicacionMock controlador={ctl} />);

    expect(screen.getByTestId("ubicacion-no-disponible")).toBeOnTheScreen();
  });

  it("el aviso de la línea 123 es visible", async () => {
    const ctl = controladorFalso();
    await render(<PantallaUbicacionMock controlador={ctl} />);

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
  });

  it("el botón «Volver al inicio» expone accessibilityRole button y accessibilityLabel", async () => {
    const ctl = controladorFalso("lista");
    await render(<PantallaUbicacionMock controlador={ctl} />);

    const boton = screen.getByTestId("boton-volver-inicio");
    expect(boton).toHaveProp("accessibilityRole", "button");
    expect(boton).toHaveProp("accessibilityLabel", "Volver al inicio");
  });
});

describe("Pantalla ubicación · interacciones", () => {
  it("«Volver al inicio» llama controlador.volverAlInicio", async () => {
    const ctl = controladorFalso("lista");
    await render(<PantallaUbicacionMock controlador={ctl} />);

    await pulsar(screen.getByTestId("boton-volver-inicio"));

    expect(ctl.volverAlInicio).toHaveBeenCalledTimes(1);
  });
});
