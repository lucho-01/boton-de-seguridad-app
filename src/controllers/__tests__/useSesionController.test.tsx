/**
 * Pruebas del controlador `useSesionController` (spec M1 · R4–R9).
 *
 * El cliente HTTP `@/api` se simula por completo: no hay red ni secure-store
 * real. `renderHook` instancia el hook; `Promise.resolve()` asienta el efecto
 * inicial sin anidar `act()`; cada acción se envuelve en `act` para que React
 * procese los cambios de estado.
 */

import { act, renderHook } from "@testing-library/react-native";

import { ApiError, type MotivoApi } from "@/api";
import {
  ERROR_CORREO_REPETIDO,
  ERROR_CREDENCIALES_INVALIDAS,
  ERROR_SIN_RED,
} from "@/services/auth";
import { useSesionController } from "../useSesionController";

jest.mock("@/api", () => {
  const actual = jest.requireActual("@/api");
  return {
    __esModule: true,
    ...actual,
    iniciarSesion: jest.fn(),
    registrarCuenta: jest.fn(),
    cerrarSesion: jest.fn(),
    leerTokens: jest.fn(async () => null),
    obtenerUsuarioActual: jest.fn(),
    comprobarHealth: jest.fn(),
  };
});

import { iniciarSesion, registrarCuenta } from "@/api";

const sesionExitosa = {
  token: "token_prueba",
  refresh_token: "refresh_prueba",
  expira_en_seg: 3600,
  usuario: { id: "u1", email: "persona@ejemplo.com" },
};

function errorApi(motivo: MotivoApi, estado: number | null): ApiError {
  return new ApiError(motivo, estado);
}

async function instalarHook() {
  const util = renderHook(() => useSesionController());
  /** Asienta el efecto inicial (restaurarSesión) sin anidar act(). */
  await Promise.resolve();
  return util;
}

describe("useSesionController · M1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registro", () => {
    it("exitoso → sesión no nula y cargando false", async () => {
      (registrarCuenta as jest.Mock).mockResolvedValue(sesionExitosa);
      const { result } = await instalarHook();

      await act(async () => {
        await result.current.registrar("persona@ejemplo.com", "Pass1234");
      });

      expect(result.current.sesion).toEqual(sesionExitosa);
      expect(result.current.cargando).toBe(false);
      expect(registrarCuenta).toHaveBeenCalledWith({
        email: "persona@ejemplo.com",
        password: "Pass1234",
      });
    });

    it("correo repetido (409) → error del campo correo y cargando false", async () => {
      (registrarCuenta as jest.Mock).mockRejectedValue(errorApi("desconocido", 409));
      const { result } = await instalarHook();

      let errorCapturado: Error | null = null;
      await act(async () => {
        try {
          await result.current.registrar("ya-existe@ejemplo.com", "Pass1234");
        } catch (error) {
          errorCapturado = error as Error;
        }
      });

      expect(errorCapturado).not.toBeNull();
      expect(errorCapturado!.message).toBe(ERROR_CORREO_REPETIDO);
      expect(result.current.cargando).toBe(false);
      expect(result.current.sesion).toBeNull();
    });

    it("sin red → error de conexión y cargando false", async () => {
      (registrarCuenta as jest.Mock).mockRejectedValue(errorApi("red", null));
      const { result } = await instalarHook();

      let errorCapturado: Error | null = null;
      await act(async () => {
        try {
          await result.current.registrar("persona@ejemplo.com", "Pass1234");
        } catch (error) {
          errorCapturado = error as Error;
        }
      });

      expect(errorCapturado).not.toBeNull();
      expect(errorCapturado!.message).toBe(ERROR_SIN_RED);
      expect(result.current.cargando).toBe(false);
    });
  });

  describe("ingreso", () => {
    it("exitoso → sesión no nula", async () => {
      (iniciarSesion as jest.Mock).mockResolvedValue(sesionExitosa);
      const { result } = await instalarHook();

      await act(async () => {
        await result.current.iniciar("persona@ejemplo.com", "Pass1234");
      });

      expect(result.current.sesion).toEqual(sesionExitosa);
      expect(result.current.cargando).toBe(false);
      expect(iniciarSesion).toHaveBeenCalledWith({
        email: "persona@ejemplo.com",
        password: "Pass1234",
      });
    });

    it("credenciales inválidas (401) → error genérico y cargando false", async () => {
      (iniciarSesion as jest.Mock).mockRejectedValue(errorApi("autorizacion", 401));
      const { result } = await instalarHook();

      let errorCapturado: Error | null = null;
      await act(async () => {
        try {
          await result.current.iniciar("persona@ejemplo.com", "Pass1234");
        } catch (error) {
          errorCapturado = error as Error;
        }
      });

      expect(errorCapturado).not.toBeNull();
      expect(errorCapturado!.message).toBe(ERROR_CREDENCIALES_INVALIDAS);
      expect(result.current.cargando).toBe(false);
      expect(result.current.sesion).toBeNull();
    });

    it("sin red → error de conexión y cargando false", async () => {
      (iniciarSesion as jest.Mock).mockRejectedValue(errorApi("red", null));
      const { result } = await instalarHook();

      let errorCapturado: Error | null = null;
      await act(async () => {
        try {
          await result.current.iniciar("persona@ejemplo.com", "Pass1234");
        } catch (error) {
          errorCapturado = error as Error;
        }
      });

      expect(errorCapturado).not.toBeNull();
      expect(errorCapturado!.message).toBe(ERROR_SIN_RED);
      expect(result.current.cargando).toBe(false);
    });
  });
});
