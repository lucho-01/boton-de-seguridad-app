/**
 * Controlador del botón SOS (M2) y de la cuenta regresiva (M3).
 *
 * Estados explícitos `idle` → `arming` → `countdown` → `lista`:
 * - `iniciar()` solo arranca desde `idle` (R3 de M2); abre un intervalo de
 *   50 ms que recalcula el progreso del armado hasta completar 3 s.
 * - Al completarse el armado arranca sola la cuenta de 5 s (R1), con su propio
 *   progreso y segundos restantes.
 * - `cancelar()` actúa desde `arming` o `countdown` (R4): vuelve a `idle` sin
 *   dejar registro y anuncia «Alerta cancelada».
 * - `volverAlInicio()` solo actúa desde `lista` (R8).
 * - `armarConBoton()` es la alternativa accesible: una pulsación arranca
 *   directamente la cuenta regresiva.
 * - Al desmontar se limpia el intervalo y el listener (R7); al pasar la app a
 *   segundo plano se cancela la fase en curso.
 *
 * Aquí sí se usa el reloj real (`new Date()`): los servicios reciben las fechas
 * inyectadas y permanecen puros. M3 no escribe en SQLite ni llama a la API.
 */

import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { evaluarArmado, progresoArmado } from "@/services/armadoSos";
import { evaluarCuenta, MS_CUENTA } from "@/services/cuentaRegresiva";
import { useBateria } from "@/sensors/useBateria";
import { useHaptics } from "@/sensors/useHaptics";
import { useUbicacion } from "@/sensors/useUbicacion";

/** Estados del flujo (M10 añadirá `preparing_sms` y `error`). */
export type EstadoArmado = "idle" | "arming" | "countdown" | "lista";

/** Ubicación capturada al llegar al estado `lista` (sin `precision_m` persistida). */
export interface UbicacionControlador {
  lat: number;
  lng: number;
  precision: number;
}

/** Lo que expone el controlador a la interfaz. */
export interface ArmadoController {
  estado: EstadoArmado;
  /** Progreso de la fase actual entre 0 y 1 (R4 de M2 y R3 de M3). */
  progreso: number;
  /** Segundos que faltan de la cuenta; 5 en reposo (R2). */
  restanteSegundos: number;
  /** Ubicación obtenida al llegar a `lista`; `null` si no se pudo obtener (R3, R5). */
  ubicacion: UbicacionControlador | null;
  /** Batería leída al iniciar la cuenta; se mantiene fija durante ella (M9 R1, R5). */
  bateria: { porcentaje: number | null; disponible: boolean };
  /** Obtiene la ubicación del dispositivo bajo demanda (M8). */
  obtenerUbicacion(): Promise<UbicacionControlador | null>;
  /** Lee el nivel de batería una vez y lo devuelve (M9). */
  obtenerBateria(): { porcentaje: number | null; disponible: boolean };
  /** Empieza a contar 3 s; solo desde `idle` (R1 y R3). */
  iniciar: () => void;
  /** Abandona el armado o la cuenta sin enviar nada (R4). */
  cancelar: () => void;
  /** Atajo accesible: una pulsación arranca la cuenta (R5). */
  armarConBoton: () => void;
  /** Inicia el armado desde una sacudida triple; solo desde `idle` (M7 R2). */
  iniciarPorSacudida: () => void;
  /** Vuelve de `lista` a `idle` (R8). */
  volverAlInicio: () => void;
}

/** Fase activa del temporizador; `null` cuando no hay nada corriendo. */
type Fase = "arming" | "countdown";

/** Cadencia del intervalo que refresca el progreso (ms). */
const MS_INTERVALO = 50;

/** Segundos iniciales de la cuenta (R2). */
export const SEGUNDOS_CUENTA = MS_CUENTA / 1000;

/** Anuncios para lector de pantalla (§3 y R5). */
export const ANUNCIO_CUENTA = "Cuenta regresiva iniciada";
export const ANUNCIO_CANCELADA = "Alerta cancelada";

/** `announceForAccessibility` opcional: si la plataforma falla, se ignora. */
function anunciar(texto: string): void {
  try {
    AccessibilityInfo.announceForAccessibility(texto);
  } catch {
    // Fallo seguro: el texto visible sigue informando.
  }
}

/** Cancela la fase en curso cuando la app deja de estar en primer plano. */
export function suscribirAppState(alCambiar: (estado: AppStateStatus) => void): () => void {
  const suscripcion = AppState.addEventListener("change", alCambiar);
  return () => {
    suscripcion.remove();
  };
}

/** Intervalo de fases: siempre llama a la última versión de `tickRef`. */
function useReloj(tickRef: RefObject<() => void>): {
  arrancarIntervalo: () => void;
  detenerIntervalo: () => void;
} {
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const detenerIntervalo = useCallback(() => {
    if (intervaloRef.current !== null) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }, []);

  const arrancarIntervalo = useCallback(() => {
    detenerIntervalo();
    intervaloRef.current = setInterval(() => {
      tickRef.current();
    }, MS_INTERVALO);
  }, [detenerIntervalo, tickRef]);

  /* Un desmontaje siempre apaga el intervalo (R7). */
  useEffect(() => detenerIntervalo, [detenerIntervalo]);

  return { arrancarIntervalo, detenerIntervalo };
}

/** Vibra cada segundo mientras `activa` es `true` (cuenta regresiva, M9 R2). */
function useVibracionCuenta(vibrarInicio: () => Promise<void>, activa: boolean): void {
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activa) {
      intervaloRef.current = setInterval(() => {
        void vibrarInicio();
      }, 1000);
    } else {
      if (intervaloRef.current !== null) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
    }
    return () => {
      if (intervaloRef.current !== null) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
    };
  }, [activa, vibrarInicio]);
}

/** Datos compartidos por las transiciones de estado del flujo. */
interface ContextoFases {
  detenerIntervalo: () => void;
  vibrarInicio: () => Promise<void>;
  montadoRef: RefObject<boolean>;
  faseRef: RefObject<Fase | null>;
  inicioFaseRef: RefObject<Date | null>;
  setEstado: Dispatch<SetStateAction<EstadoArmado>>;
  setProgreso: Dispatch<SetStateAction<number>>;
  setRestanteSegundos: Dispatch<SetStateAction<number>>;
  /** Captura la ubicación al llegar al estado `lista` (M8). */
  capturarUbicacion: () => void;
  /** Lee el nivel de batería una vez al iniciar la cuenta (M9 R1, R5). */
  capturarBateria: () => void;
}

/** Transiciones de estado: armar, iniciar cuenta, terminarla y volver a idle. */
function useTransiciones(contexto: ContextoFases) {
  const {
    detenerIntervalo,
    vibrarInicio,
    montadoRef,
    faseRef,
    inicioFaseRef,
    setEstado,
    setProgreso,
    setRestanteSegundos,
    capturarUbicacion,
    capturarBateria,
  } = contexto;

  /** Arranca el armado de 3 s desde `idle` (R1 de M2). */
  const empezarArmado = useCallback(
    (ahora: Date) => {
      faseRef.current = "arming";
      inicioFaseRef.current = ahora;
      setProgreso(progresoArmado(ahora, ahora));
      setEstado("arming");
    },
    [faseRef, inicioFaseRef, setEstado, setProgreso],
  );

  /** Instante en que arrancó la cuenta de 5 s, con su anuncio y su vibración. */
  const iniciarCuenta = useCallback(
    (ahora: Date) => {
      faseRef.current = "countdown";
      inicioFaseRef.current = ahora;
      if (!montadoRef.current) {
        return;
      }
      setProgreso(0);
      setRestanteSegundos(SEGUNDOS_CUENTA);
      setEstado("countdown");
      void vibrarInicio();
      anunciar(ANUNCIO_CUENTA);
      capturarBateria();
    },
    [
      capturarBateria,
      vibrarInicio,
      faseRef,
      inicioFaseRef,
      montadoRef,
      setEstado,
      setProgreso,
      setRestanteSegundos,
    ],
  );

  /** Fin de la cuenta: sin SMS todavía, queda `lista` (R8) y captura ubicación (M8). */
  const terminarCuenta = useCallback(() => {
    detenerIntervalo();
    faseRef.current = null;
    inicioFaseRef.current = null;
    if (!montadoRef.current) {
      return;
    }
    setProgreso(1);
    setRestanteSegundos(0);
    setEstado("lista");
    capturarUbicacion();
  }, [
    detenerIntervalo,
    faseRef,
    inicioFaseRef,
    montadoRef,
    setEstado,
    setProgreso,
    setRestanteSegundos,
    capturarUbicacion,
  ]);

  /** Vuelve a `idle` sin anunciar; lo usan `cancelar` y el segundo plano. */
  const volverAIdle = useCallback(() => {
    detenerIntervalo();
    faseRef.current = null;
    inicioFaseRef.current = null;
    if (!montadoRef.current) {
      return;
    }
    setProgreso(0);
    setRestanteSegundos(SEGUNDOS_CUENTA);
    setEstado("idle");
  }, [
    detenerIntervalo,
    faseRef,
    inicioFaseRef,
    montadoRef,
    setEstado,
    setProgreso,
    setRestanteSegundos,
  ]);

  return { empezarArmado, iniciarCuenta, terminarCuenta, volverAIdle };
}

/** Transiciones que necesitan las acciones públicas. */
interface TransicionesPublicas {
  empezarArmado: (ahora: Date) => void;
  iniciarCuenta: (ahora: Date) => void;
  volverAIdle: () => void;
}

/** Acciones públicas del controlador. */
interface AccionesFlujo {
  iniciar: () => void;
  cancelar: () => void;
  armarConBoton: () => void;
  iniciarPorSacudida: () => void;
  volverAlInicio: () => void;
}

/** Acciones públicas con sus guardas de estado (R4, R5 y R8). */
function useAccionesFlujo(
  estado: EstadoArmado,
  transiciones: TransicionesPublicas,
  arrancarIntervalo: () => void,
  vibrarInicio: () => Promise<void>,
): AccionesFlujo {
  const { empezarArmado, iniciarCuenta, volverAIdle } = transiciones;

  const iniciar = useCallback(() => {
    if (estado !== "idle") {
      return;
    }
    empezarArmado(new Date());
    void vibrarInicio();
    arrancarIntervalo();
  }, [estado, empezarArmado, vibrarInicio, arrancarIntervalo]);

  /** Inicia el armado desde una sacudida triple y anuncia (M7 R2 y R6). */
  const iniciarPorSacudida = useCallback(() => {
    if (estado !== "idle") {
      return;
    }
    iniciar();
    anunciar(ANUNCIO_CUENTA);
  }, [estado, iniciar]);

  const cancelar = useCallback(() => {
    if (estado !== "arming" && estado !== "countdown") {
      return;
    }
    volverAIdle();
    void vibrarInicio();
    anunciar(ANUNCIO_CANCELADA);
  }, [estado, volverAIdle, vibrarInicio]);

  const armarConBoton = useCallback(() => {
    if (estado !== "idle") {
      return;
    }
    iniciarCuenta(new Date());
    arrancarIntervalo();
  }, [estado, iniciarCuenta, arrancarIntervalo]);

  const volverAlInicio = useCallback(() => {
    if (estado !== "lista") {
      return;
    }
    volverAIdle();
  }, [estado, volverAIdle]);

  return { iniciar, cancelar, armarConBoton, iniciarPorSacudida, volverAlInicio };
}

/** Lectura y exposición del nivel de batería para el controlador (M9). */
function useBateriaArmado(): {
  bateria: { porcentaje: number | null; disponible: boolean };
  capturarBateria: () => void;
  obtenerBateria: () => { porcentaje: number | null; disponible: boolean };
} {
  const { disponible: bateriaDisponible, porcentaje: bateriaPorcentaje } = useBateria();
  const [bateria, setBateria] = useState<{ porcentaje: number | null; disponible: boolean }>({
    porcentaje: null,
    disponible: false,
  });

  /** Sincroniza el estado de batería con la lectura del sensor. */
  useEffect(() => {
    setBateria({ porcentaje: bateriaPorcentaje, disponible: bateriaDisponible });
  }, [bateriaDisponible, bateriaPorcentaje]);

  /** Lee el nivel de batería una vez al iniciar la cuenta (M9 R1, R5). */
  const capturarBateria = useCallback(() => {
    setBateria({ porcentaje: bateriaPorcentaje, disponible: bateriaDisponible });
  }, [bateriaDisponible, bateriaPorcentaje]);

  /** Devuelve la batería leída al iniciar la cuenta (M9). */
  const obtenerBateria = useCallback(
    () => ({
      porcentaje: bateria.porcentaje,
      disponible: bateria.disponible,
    }),
    [bateria],
  );

  return { bateria, capturarBateria, obtenerBateria };
}

/** Hook del flujo SOS: armado, cuenta y cancelación. Sin red ni SQLite. */
export function useArmadoController(): ArmadoController {
  const [estado, setEstado] = useState<EstadoArmado>("idle");
  const [progreso, setProgreso] = useState(0);
  const [restanteSegundos, setRestanteSegundos] = useState(SEGUNDOS_CUENTA);
  const [ubicacion, setUbicacion] = useState<UbicacionControlador | null>(null);

  const { vibrarInicio } = useHaptics();
  const { obtenerUbicacion: obtenerUbicacionSensor } = useUbicacion();
  const { bateria, capturarBateria, obtenerBateria } = useBateriaArmado();
  const cuentaActiva = estado === "countdown";

  const montadoRef = useRef(true);
  const faseRef = useRef<Fase | null>(null);
  const inicioFaseRef = useRef<Date | null>(null);
  const tickRef = useRef<() => void>(() => undefined);

  const { arrancarIntervalo, detenerIntervalo } = useReloj(tickRef);

  /** Pide la ubicación al sensor y la devuelve en el formato del controlador. */
  const obtenerUbicacion = useCallback(async (): Promise<UbicacionControlador | null> => {
    const resultado = await obtenerUbicacionSensor();
    if (resultado === null) {
      return null;
    }
    return {
      lat: resultado.latitud,
      lng: resultado.longitud,
      precision: resultado.precision,
    };
  }, [obtenerUbicacionSensor]);

  /** Dispara la obtención de ubicación al entrar en `lista` (ignora si ya se desmontó). */
  const capturarUbicacion = useCallback(async () => {
    const ubic = await obtenerUbicacion();
    if (montadoRef.current) {
      setUbicacion(ubic);
    }
  }, [obtenerUbicacion, montadoRef]);

  /** Vibra cada segundo durante la cuenta regresiva (M9 R2). */
  useVibracionCuenta(vibrarInicio, cuentaActiva);

  const transiciones = useTransiciones({
    detenerIntervalo,
    vibrarInicio,
    montadoRef,
    faseRef,
    inicioFaseRef,
    setEstado,
    setProgreso,
    setRestanteSegundos,
    capturarUbicacion,
    capturarBateria,
  });
  const { empezarArmado, iniciarCuenta, terminarCuenta, volverAIdle } = transiciones;

  /** Lectura periódica de la fase activa con el tiempo real (R1–R3). */
  const tick = useCallback(() => {
    const inicio = inicioFaseRef.current;
    if (inicio === null) {
      return;
    }
    const ahora = new Date();
    if (faseRef.current === "arming") {
      const armado = evaluarArmado({ inicio, ahora });
      if (armado.completado) {
        iniciarCuenta(ahora);
        return;
      }
      setProgreso(armado.progreso);
      return;
    }
    if (faseRef.current === "countdown") {
      const cuenta = evaluarCuenta({ inicio, ahora });
      if (cuenta.completada) {
        terminarCuenta();
        return;
      }
      setProgreso(cuenta.progreso);
      setRestanteSegundos(cuenta.restanteSegundos);
    }
  }, [iniciarCuenta, terminarCuenta]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useCicloDeVidaArmado(detenerIntervalo, volverAIdle, faseRef, inicioFaseRef, montadoRef);

  const acciones = useAccionesFlujo(
    estado,
    { empezarArmado, iniciarCuenta, volverAIdle },
    arrancarIntervalo,
    vibrarInicio,
  );

  return {
    estado,
    progreso,
    restanteSegundos,
    ubicacion,
    bateria,
    obtenerUbicacion,
    obtenerBateria,
    iniciar: acciones.iniciar,
    cancelar: acciones.cancelar,
    armarConBoton: acciones.armarConBoton,
    iniciarPorSacudida: acciones.iniciarPorSacudida,
    volverAlInicio: acciones.volverAlInicio,
  };
}

/** Desmontaje (R7) y paso a segundo plano: nada de timers ni listeners vivos. */
function useCicloDeVidaArmado(
  detenerIntervalo: () => void,
  volverAIdle: () => void,
  faseRef: RefObject<Fase | null>,
  inicioFaseRef: RefObject<Date | null>,
  montadoRef: RefObject<boolean>,
): void {
  useEffect(() => {
    montadoRef.current = true;
    const alCambiar = (siguiente: AppStateStatus) => {
      if (siguiente === "active") {
        return;
      }
      if (faseRef.current === null) {
        return;
      }
      volverAIdle();
      anunciar(ANUNCIO_CANCELADA);
    };
    const quitar = suscribirAppState(alCambiar);
    return () => {
      montadoRef.current = false;
      quitar();
      detenerIntervalo();
      faseRef.current = null;
      inicioFaseRef.current = null;
    };
  }, [detenerIntervalo, faseRef, inicioFaseRef, montadoRef, volverAIdle]);
}
