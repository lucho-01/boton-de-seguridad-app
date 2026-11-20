/**
 * Spec M6 · pantalla de ajustes (`app/ajustes.tsx`).
 *
 * Se inyecta un controlador falso, así que no se toca SQLite ni la red.
 * Se envuelve en `SesionProvider` porque la pantalla consume `useSesion()`.
 * `expo-router` se simula para evitar efectos secundarios de navegación.
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SesionProvider } from "@/controllers/sesionContext";
import PantallaAjustes from "../app/ajustes";
import { TEXTO_AVISO_123 } from "@/components/AvisoLinea123";
import { type AjustesController } from "@/controllers/useAjustesController";

const MENSAJE_POR_DEFECTO =
  "Alerta de seguridad: necesito ayuda. Mi ubicación es [enlace de mapa].";
const MENSAJE_LARGO = "x".repeat(161);
const ERROR_LARGO = "El mensaje base no puede superar los 160 caracteres.";

const METRICAS_SEGURAS = {
  frame: { x: 0, y: 0, width: 430, height: 932 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function controladorFalso(sobreescritos: Partial<AjustesController> = {}): AjustesController {
  return {
    ajustes: {
      umbralSacudida: 15,
      ventanaSacudida: 2000,
      mensajeBase: MENSAJE_POR_DEFECTO,
    },
    cargando: false,
    puedeGuardar: true,
    aviso: null,
    actualizarMensajeBase: jest.fn(async (): Promise<{ ok: boolean }> => ({
      ok: true,
    })),
    actualizarSensibilidad: jest.fn(async (): Promise<void> => undefined),
    restablecerValoresPorDefecto: jest.fn(async (): Promise<void> => undefined),
    guardar: jest.fn(async (): Promise<void> => undefined),
    ...sobreescritos,
  };
}

async function renderPantalla(ctl: AjustesController) {
  await act(async () => {
    render(
      <SafeAreaProvider initialMetrics={METRICAS_SEGURAS}>
        <SesionProvider>
          <PantallaAjustes controlador={ctl} />
        </SesionProvider>
      </SafeAreaProvider>,
    );
  });
}

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

function mockGuardar(ctl: AjustesController): jest.Mock {
  return jest.mocked(ctl.guardar);
}

function mockRestablecer(ctl: AjustesController): jest.Mock {
  return jest.mocked(ctl.restablecerValoresPorDefecto);
}

describe("PantallaAjustes", () => {
  it("muestra los bloques de sensibilidad y mensaje base", async () => {
    const ctl = controladorFalso();
    await renderPantalla(ctl);

    expect(screen.getByText(/Sensibilidad de la sacudida/)).toBeOnTheScreen();
    expect(screen.getByText("Mensaje de emergencia")).toBeOnTheScreen();
  });

  it("muestra el mensaje base por defecto en el campo", async () => {
    const ctl = controladorFalso();
    await renderPantalla(ctl);

    expect(screen.getByLabelText("Mensaje base del SMS de emergencia")).toBeOnTheScreen();
    expect(screen.getByText("70 / 160 caracteres")).toBeOnTheScreen();
  });

  it("escribir un mensaje mayor a 160 muestra el error y no guarda", async () => {
    const ctl = controladorFalso({
      actualizarMensajeBase: jest.fn(
        async (): Promise<{
          ok: boolean;
          error: string;
        }> => ({
          ok: false,
          error: ERROR_LARGO,
        }),
      ),
    });
    await renderPantalla(ctl);

    const input = screen.getByLabelText("Mensaje base del SMS de emergencia");

    await act(async () => {
      fireEvent.changeText(input, MENSAJE_LARGO);
    });
    await act(async () => {});
    await act(async () => {});

    expect(jest.mocked(ctl.actualizarMensajeBase)).toHaveBeenCalledWith(MENSAJE_LARGO);
    expect(screen.getByText(ERROR_LARGO)).toBeOnTheScreen();
    expect(mockGuardar(ctl)).not.toHaveBeenCalled();
  });

  it("guardar llama a ctl.guardar", async () => {
    const ctl = controladorFalso();
    await renderPantalla(ctl);

    await act(async () => {
      await fireEvent.press(
        screen.getByLabelText("Guardar ajustes de sensibilidad y mensaje base"),
      );
    });

    expect(mockGuardar(ctl)).toHaveBeenCalledTimes(1);
  });

  it("restablecer valores por defecto llama a ctl.restablecerValoresPorDefecto", async () => {
    const ctl = controladorFalso();
    await renderPantalla(ctl);

    await act(async () => {
      await fireEvent.press(
        screen.getByLabelText("Restablecer valores por defecto de sensibilidad y mensaje base"),
      );
    });

    expect(mockRestablecer(ctl)).toHaveBeenCalledTimes(1);
  });

  it("cada control tiene etiqueta accesible propia", async () => {
    const ctl = controladorFalso();
    await renderPantalla(ctl);

    expect(screen.getByLabelText("Umbral de aceleración de la sacudida")).toBeOnTheScreen();
    expect(screen.getByLabelText("Ventana de tiempo para detectar sacudidas")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mensaje base del SMS de emergencia")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Guardar ajustes de sensibilidad y mensaje base"),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Restablecer valores por defecto de sensibilidad y mensaje base"),
    ).toBeOnTheScreen();
  });

  it("el aviso de la línea 123 sigue visible", async () => {
    const ctl = controladorFalso();
    await renderPantalla(ctl);

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
  });
});
