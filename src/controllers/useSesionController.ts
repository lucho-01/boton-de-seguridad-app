/**
 * Controlador de sesión de M0 (spec R8, R9 y §7).
 *
 * - Al montar restaura la sesión guardada: si hay tokens, `GET /api/auth/yo`
 *   la confirma (R9); si falla por red queda «sin conexión» y sin sesión.
 * - `verificarApi()` comprueba `GET /api/health` (R8).
 * - `iniciar()` y `registrar()` quedan listos para los formularios de M1.
 * - `cerrar()` borra los tokens del dispositivo.
 *
 * Sin `Date.now()` ni `new Date()`: el tiempo no interviene en este controlador.
 * Los tokens nunca salen del estado ni se registran.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ApiError,
  cerrarSesion,
  comprobarHealth,
  type Credenciales,
  iniciarSesion,
  leerTokens,
  obtenerUsuarioActual,
  registrarCuenta,
} from "@/api";
import type { MotivoApi } from "@/api";
import type { Sesion } from "@/models";
import {
  ERROR_CORREO_REPETIDO,
  ERROR_CREDENCIALES_INVALIDAS,
  ERROR_SERVIDOR,
  ERROR_SIN_RED,
} from "@/services/auth";

/** Estado de la conexión con la API (R8 y §7). */
export type EstadoApi = "sin_comprobar" | "conectado" | "sin_conexion" | "error";

/** Lo que expone el controlador a la interfaz. */
export interface SesionController {
  /** `true` mientras se restaura la sesión guardada (R9). */
  iniciando: boolean;
  /** `true` mientras se envía `iniciar` o `registrar` (M1). */
  cargando: boolean;
  sesion: Sesion | null;
  estadoApi: EstadoApi;
  /** `true` mientras corre `GET /api/health`. */
  comprobando: boolean;
  verificarApi: () => Promise<void>;
  iniciar: (email: string, password: string) => Promise<void>;
  registrar: (email: string, password: string) => Promise<void>;
  cerrar: () => Promise<void>;
}

/** Sin sesión se conserva `expira_en_seg: 0`: el refresh es reactivo (M14). */
const SIN_EXPIRACION = 0;

/** Motivos de red y de tiempo que cuentan como «sin conexión» (R8). */
const MOTIVOS_SIN_CONEXION: ReadonlySet<MotivoApi> = new Set(["red", "tiempo"]);

/** Traduce un `ApiError` de `health` al estado visible (R8 y §7). */
const ESTADO_POR_MOTIVO: Readonly<Record<MotivoApi, EstadoApi>> = {
  red: "sin_conexion",
  tiempo: "sin_conexion",
  configuracion: "error",
  validacion: "error",
  servidor: "error",
  autorizacion: "error",
  demasiados_intentos: "error",
  desconocido: "error",
};

function estadoDeMotivo(motivo: MotivoApi): EstadoApi {
  return ESTADO_POR_MOTIVO[motivo];
}

function esSinConexion(motivo: MotivoApi): boolean {
  return MOTIVOS_SIN_CONEXION.has(motivo);
}

/** Normaliza cualquier fallo a `ApiError` sin filtrar su cuerpo. */
function aErrorApi(fallo: Error): ApiError {
  if (fallo instanceof ApiError) {
    return fallo;
  }
  return new ApiError("desconocido", null);
}

/**
 * Traduce un `ApiError` de autenticación al mensaje de usuario (M1 §7).
 *
 * - 409 al registrar → «Ese correo ya está registrado.» (campo correo)
 * - 401 al iniciar → «Correo o contraseña incorrectos.» (genérico)
 * - Red / tiempo → «No hay conexión a internet. Intenta de nuevo.»
 * - Servidor → «Error interno. Intenta de nuevo.»
 */
function errorDeAuth(error: ApiError, esRegistro: boolean): Error {
  if (esRegistro && error.estado === 409) {
    return new Error(ERROR_CORREO_REPETIDO);
  }
  if (!esRegistro && error.estado === 401) {
    return new Error(ERROR_CREDENCIALES_INVALIDAS);
  }
  if (esSinConexion(error.motivo)) {
    return new Error(ERROR_SIN_RED);
  }
  if (error.motivo === "servidor") {
    return new Error(ERROR_SERVIDOR);
  }
  return error;
}

/**
 * Acción de autenticación compartida por `iniciar` y `registrar` (M1).
 *
 * Activa `cargando`, llama al endpoint de la API y, al finalizar, lo desactiva.
 * Ignora la respuesta si el componente ya se desmontó.
 */
async function ejecutarAuth(
  apiFn: (credenciales: Credenciales) => Promise<Sesion>,
  email: string,
  password: string,
  esRegistro: boolean,
  montado: React.MutableRefObject<boolean>,
  setSesion: (valor: Sesion | null) => void,
  setCargando: (valor: boolean) => void,
): Promise<void> {
  setCargando(true);
  try {
    const nueva = await apiFn({ email, password });
    if (!montado.current) {
      return;
    }
    setSesion(nueva);
  } catch (fallo) {
    if (!montado.current) {
      return;
    }
    if (!(fallo instanceof Error)) {
      throw new Error("No se pudo completar la operación.");
    }
    throw errorDeAuth(aErrorApi(fallo), esRegistro);
  } finally {
    if (montado.current) {
      setCargando(false);
    }
  }
}

/**
 * Restaura la sesión guardada (R9).
 *
 * Devuelve la `Sesion` reconstruida con el usuario confirmado por
 * `GET /api/auth/yo`, o `sesion: null` si no hay tokens, si la sesión expiró
 * (autorización) o si falló la red. En el último caso `estadoApi` queda en
 * «sin conexión» para que la interfaz lo muestre (§7).
 */
async function restaurarSesion(): Promise<{ sesion: Sesion | null; estadoApi: EstadoApi } | null> {
  const tokens = await leerTokens();
  if (tokens === null) {
    return { sesion: null, estadoApi: "sin_comprobar" };
  }
  try {
    const usuario = await obtenerUsuarioActual();
    const sesion: Sesion = {
      token: tokens.token,
      refresh_token: tokens.refresh_token,
      expira_en_seg: SIN_EXPIRACION,
      usuario,
    };
    return { sesion, estadoApi: "sin_comprobar" };
  } catch (fallo) {
    if (!(fallo instanceof Error)) {
      return { sesion: null, estadoApi: "error" };
    }
    const error = aErrorApi(fallo);
    if (esSinConexion(error.motivo)) {
      return { sesion: null, estadoApi: "sin_conexion" };
    }
    return { sesion: null, estadoApi: "sin_comprobar" };
  }
}

/** Hook de sesión: estado explícito y acciones en `useCallback`. */
export function useSesionController(): SesionController {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [iniciando, setIniciando] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [estadoApi, setEstadoApi] = useState<EstadoApi>("sin_comprobar");
  const [comprobando, setComprobando] = useState(false);

  /** `false` cuando el componente se desmonta: ignora respuestas tardías. */
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    const restaurar = async () => {
      let resultado: Awaited<ReturnType<typeof restaurarSesion>> = null;
      try {
        resultado = await restaurarSesion();
      } catch {
        resultado = null;
      }
      if (!montado.current) {
        return;
      }
      if (resultado !== null) {
        setSesion(resultado.sesion);
        setEstadoApi(resultado.estadoApi);
      }
      setIniciando(false);
    };
    void restaurar();
    return () => {
      montado.current = false;
    };
  }, []);

  const verificarApi = useCallback(async () => {
    setComprobando(true);
    try {
      await comprobarHealth();
      if (!montado.current) {
        return;
      }
      setEstadoApi("conectado");
    } catch (fallo) {
      if (!montado.current) {
        return;
      }
      if (!(fallo instanceof Error)) {
        setEstadoApi("error");
        return;
      }
      setEstadoApi(estadoDeMotivo(aErrorApi(fallo).motivo));
    } finally {
      if (montado.current) {
        setComprobando(false);
      }
    }
  }, []);

  const iniciar = useCallback(async (email: string, password: string) => {
    await ejecutarAuth(iniciarSesion, email, password, false, montado, setSesion, setCargando);
  }, []);

  const registrar = useCallback(async (email: string, password: string) => {
    await ejecutarAuth(registrarCuenta, email, password, true, montado, setSesion, setCargando);
  }, []);

  const cerrar = useCallback(async () => {
    await cerrarSesion();
    if (!montado.current) {
      return;
    }
    setSesion(null);
  }, []);

  return {
    sesion,
    iniciando,
    cargando,
    estadoApi,
    comprobando,
    verificarApi,
    iniciar,
    registrar,
    cerrar,
  };
}
