import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  return {
    __esModule: true,
    useFocusEffect: (callback: () => void) => {
      React.useEffect(callback, [callback]);
    },
  };
});

jest.mock("@/controllers/useHistorialController", () => ({
  __esModule: true,
  useHistorialController: jest.fn(),
}));

import PantallaHistorial from "../app/(tabs)/historial";
import {
  useHistorialController,
  type HistorialController,
} from "@/controllers/useHistorialController";
import type { Alerta } from "@/models";

const ALERTA: Alerta = {
  id: "00000000-0000-4000-8000-000000000001",
  remote_id: null,
  created_at: "2026-11-20T22:00:00.000Z",
  updated_at: "2026-11-20T22:00:00.000Z",
  deleted_at: null,
  pending: 1,
  deleted: 0,
  lat: 4.71,
  lng: -74.07,
  precision_m: 12,
  bateria_pct: 84,
  estado: "mensaje_preparado",
  creada_en: "2026-11-20T22:00:00.000Z",
};

function controlador(cambios: Partial<HistorialController> = {}): HistorialController {
  return {
    alertas: [],
    cargando: false,
    aviso: null,
    refrescar: jest.fn(async () => undefined),
    ...cambios,
  };
}

describe("PantallaHistorial · M12", () => {
  beforeEach(() => {
    jest.mocked(useHistorialController).mockReset();
  });

  it("muestra estado, fecha, ubicación y batería de una alerta", async () => {
    const ctl = controlador({ alertas: [ALERTA] });
    jest.mocked(useHistorialController).mockReturnValue(ctl);
    await render(<PantallaHistorial />);

    expect(screen.getByText("Historial")).toBeOnTheScreen();
    expect(screen.getByText("Mensaje preparado")).toBeOnTheScreen();
    expect(screen.getByText("Ubicación registrada · Batería 84%")).toBeOnTheScreen();
  });

  it("ofrece reintentar si el controlador informa un error", async () => {
    const ctl = controlador({ aviso: "No se pudo cargar el historial. Intenta de nuevo." });
    jest.mocked(useHistorialController).mockReturnValue(ctl);
    await render(<PantallaHistorial />);

    fireEvent.press(screen.getByLabelText("Volver a cargar el historial"));
    expect(ctl.refrescar).toHaveBeenCalled();
  });
});
