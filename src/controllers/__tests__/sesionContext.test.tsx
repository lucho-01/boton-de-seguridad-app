import { act, render, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import type { Sesion } from "@/models";
import { SesionProvider } from "../sesionContext";
import { useSesionController, type SesionController } from "../useSesionController";
import {
  useSincronizacionController,
  type SincronizacionController,
} from "../useSincronizacionController";

jest.mock("../useSesionController", () => ({
  useSesionController: jest.fn(),
}));
jest.mock("../useSincronizacionController", () => ({
  useSincronizacionController: jest.fn(),
}));

const SESION: Sesion = {
  token: "token-prueba",
  refresh_token: "refresh-prueba",
  expira_en_seg: 3600,
  usuario: { id: "usuario-1", email: "persona@ejemplo.com" },
};

const controladorSesion: SesionController = {
  iniciando: false,
  cargando: false,
  sesion: SESION,
  estadoApi: "conectado",
  comprobando: false,
  verificarApi: jest.fn(async () => undefined),
  iniciar: jest.fn(async () => undefined),
  registrar: jest.fn(async () => undefined),
  cerrar: jest.fn(async () => undefined),
};

const controladorSincronizacion: SincronizacionController = {
  estado: "pendiente",
  mensaje: "La sincronización empezará automáticamente.",
  sincronizar: jest.fn(async () => undefined),
  esperar: jest.fn(async () => undefined),
};

describe("SesionProvider · sincronización M14", () => {
  let cambiarEstado: ((estado: AppStateStatus) => void) | null;

  beforeEach(() => {
    cambiarEstado = null;
    jest.mocked(useSesionController).mockReturnValue(controladorSesion);
    jest.mocked(useSincronizacionController).mockReturnValue(controladorSincronizacion);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_evento, listener) => {
      cambiarEstado = listener;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sincroniza al restaurar la sesión y al volver a primer plano", async () => {
    render(
      <SesionProvider>
        <></>
      </SesionProvider>,
    );

    await waitFor(() => {
      expect(controladorSincronizacion.sincronizar).toHaveBeenCalledTimes(1);
    });

    act(() => {
      cambiarEstado?.("background");
    });
    expect(controladorSincronizacion.sincronizar).toHaveBeenCalledTimes(1);

    act(() => {
      cambiarEstado?.("active");
    });
    expect(controladorSincronizacion.sincronizar).toHaveBeenCalledTimes(2);
  });
});
