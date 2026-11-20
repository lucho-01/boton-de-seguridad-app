/**
 * Spec M2 y M3 · armado, cuenta regresiva y §7
 * (`src/controllers/useArmadoController.ts`).
 *
 * Tiempo falso: `jest.useFakeTimers` con una fecha fija y
 * `jest.advanceTimersByTimeAsync` dentro de `act`, sin esperas reales ni
 * `process.env`. Hardware simulado: `expo-haptics` se mockea módulo a módulo y
 * `announceForAccessibility` se espía con `jest.spyOn`.
 *
 * Cada caso monta **una sola vez** con `montar()` y el `afterEach` cierra con
 * `desmontar()`. El efecto de desmontaje es pasivo y React lo difiere hasta el
 * siguiente `act`, por eso `desmontar()` vacía ese tick antes de seguir. Los
 * recuentos de vibración y de timers se hacen por diferencia respecto a un
 * punto de referencia.
 */

import { act, renderHook, type RenderHookResult } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";

jest.mock("expo-haptics", () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  impactAsync: jest.fn(async () => undefined),
}));

import {
  ANUNCIO_CANCELADA,
  ANUNCIO_CUENTA,
  SEGUNDOS_CUENTA,
  useArmadoController,
  type ArmadoController,
} from "@/controllers";
import { MS_ARMADO } from "@/services/armadoSos";
import { MS_CUENTA } from "@/services/cuentaRegresiva";

type VistaDelArmado = RenderHookResult<ArmadoController, object>;

const MS_INTERVALO = 50;

const mockImpacto = jest.mocked(Haptics.impactAsync);

let anuncios: jest.SpyInstance<void, [string, number?]> | null = null;
let vistaAbierta: VistaDelArmado | null = null;

/** Avanza el reloj falso y asienta las promesas que resuelve. */
async function avanzar(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/** Timers vivos del caso. */
function timersVivos(): number {
  return jest.getTimerCount();
}

/** Monta el controlador, lo deja para `desmontar()` y vacía sus promesas. */
async function montar(): Promise<VistaDelArmado> {
  const vista = await renderHook(() => useArmadoController());
  // El montaje habilita el modo `act`; la vista queda a cargo de `desmontar()`.
  vistaAbierta = vista;
  await act(async () => {});
  return vista;
}

/**
 * Desmonta la vista abierta y vacía el efecto de desmontaje pasivo (R7).
 *
 * El cleanup de efectos es pasivo: React lo difiere hasta el siguiente `act`,
 * y bajo `IS_REACT_ACT_ENVIRONMENT` ese tick no llega solo. Vive fuera del
 * `afterEach` porque un `afterEach` asíncrono deja la vista colgada y el
 * siguiente `renderHook` recibe `result.current === null`.
 */
async function desmontar(): Promise<void> {
  const vista = vistaAbierta;
  if (vista === null) {
    return;
  }
  vistaAbierta = null;
  /* `unmount()` es asíncrono en RNTL 14: hay que esperarlo o el cleanup se difiere. */
  await vista.unmount();
}

/** Arranca el gesto desde `idle`, con la vista lista para avanzar. */
async function arrancar(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.iniciar();
  });
}

/** Completa el gesto con una pulsación del botón alternativo. */
async function armarConBoton(vista: VistaDelArmado): Promise<void> {
  await act(async () => {
    vista.result.current.armarConBoton();
  });
}

function llamadasDeVibracion(estilo: string): number {
  return mockImpacto.mock.calls.filter(([usado]) => usado === estilo).length;
}

function textosAnunciados(): string[] {
  return anuncios?.mock.calls.map(([texto]) => texto) ?? [];
}

/** Escucha que el controlador registra con `(estado) => void`. */
type EscuchaAppState = (estado: AppStateStatus) => void;

/**
 * Lo que ofrece el simulador de `AppState` a cada caso (§7 y R7).
 *
 * `AppState` en Jest es la instancia que reexporta `react-native`; se sustituye
 * su `addEventListener` una sola vez (primer `setupAppState`) y se anota para
 * poder revertirlo al final del archivo.
 */
interface SimuladorAppState {
  /** Entrega un cambio de estado de la app a la escucha registrada. */
  emitir: (estado: AppStateStatus) => void;
  /** `remove()` de la suscripción devuelta al controlador (R7). */
  remove: jest.Mock<void, []>;
}

/** Escucha vigente del caso. */
let escuchaDeAppState: EscuchaAppState | null = null;
/** Descriptor original de `AppState.addEventListener`, para revertirlo. */
let originalAppState: PropertyDescriptor | null = null;

/** Instala (una vez) el CapturadorObservable y arma un caso limpio. */
function setupAppState(): SimuladorAppState {
  const remove = jest.fn<void, []>();
  originalAppState = Object.getOwnPropertyDescriptor(AppState, "addEventListener") ?? null;
  Object.defineProperty(AppState, "addEventListener", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: (_tipo: string, recibida: EscuchaAppState) => {
      escuchaDeAppState = recibida;
      return {
        remove: () => {
          remove();
        },
      };
    },
  });
  escuchaDeAppState = null;
  return {
    emitir: (estado: AppStateStatus) => {
      if (escuchaDeAppState !== null) {
        escuchaDeAppState(estado);
      }
    },
    remove,
  };
}

/** Descarta el simulador del caso, que ya lleva su propio `remove`. */
function olvidarAppState(): void {
  if (originalAppState !== null) {
    Object.defineProperty(AppState, "addEventListener", originalAppState);
    originalAppState = null;
  }
  escuchaDeAppState = null;
}

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date("2026-11-14T10:00:00.000Z"),
    doNotFake: ["nextTick", "queueMicrotask"],
  });
  mockImpacto.mockClear();
  mockImpacto.mockImplementation(async () => undefined);
  anuncios = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  anuncios.mockImplementation(() => undefined);
});

afterEach(async () => {
  const vista = vistaAbierta;
  vistaAbierta = null;
  if (vista !== null) {
    await vista.unmount();
  }
  olvidarAppState();
  anuncios?.mockRestore();
  anuncios = null;
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("useArmadoController · estado inicial", () => {
  it("arranca en idle con progreso 0 y sin anuncios", async () => {
    const vista = await montar();

    expect(vista.result.current.estado).toBe("idle");
    expect(vista.result.current.progreso).toBe(0);
    expect(vista.result.current.restanteSegundos).toBe(SEGUNDOS_CUENTA);
    expect(textosAnunciados()).toEqual([]);
  });

  it("montar el controlador no vibra: la háptica solo suena al iniciar la cuenta", async () => {
    await montar();

    expect(llamadasDeVibracion("light")).toBe(0);
    expect(llamadasDeVibracion("medium")).toBe(0);
  });
});

describe("useArmadoController · R1/R4 iniciar y progresar", () => {
  it("iniciar() pasa a arming y vibra una vez al empezar", async () => {
    const vista = await montar();
    const lucesAntes = llamadasDeVibracion("light");

    await arrancar(vista);

    expect(vista.result.current.estado).toBe("arming");
    expect(vista.result.current.progreso).toBe(0);
    expect(llamadasDeVibracion("light")).toBe(lucesAntes + 1);
  });

  it("el progreso avanza con los timers hasta la mitad", async () => {
    const vista = await montar();
    await arrancar(vista);

    await avanzar(MS_ARMADO / 2);

    expect(vista.result.current.estado).toBe("arming");
    expect(vista.result.current.progreso).toBe(0.5);
    expect(textosAnunciados()).toEqual([]);
  });

  it("a 1500 ms también está a la mitad y sigue sin anunciar", async () => {
    const vista = await montar();
    await arrancar(vista);

    await avanzar(1500);

    expect(vista.result.current.progreso).toBe(0.5);
    expect(textosAnunciados()).toEqual([]);
  });

  it("a 2999 ms sigue en arming y por debajo de 1", async () => {
    const vista = await montar();
    await arrancar(vista);

    await avanzar(2999);

    expect(vista.result.current.estado).toBe("arming");
    expect(vista.result.current.progreso).toBeLessThan(1);
    // El progreso se refresca cada 50 ms: a 2999 quedó la última lectura (2950).
    expect(vista.result.current.progreso).toBeGreaterThan(0.98);
    expect(textosAnunciados()).toEqual([]);
  });
});

describe("useArmadoController · R2/R5 cancelar", () => {
  it("cancelar() a mitad vuelve a idle con progreso 0 y sin anuncio de cuenta", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(1500);
    expect(vista.result.current.progreso).toBe(0.5);

    await act(async () => {
      vista.result.current.cancelar();
    });

    expect(vista.result.current.estado).toBe("idle");
    expect(vista.result.current.progreso).toBe(0);
    expect(textosAnunciados()).not.toContain(ANUNCIO_CUENTA);
    expect(textosAnunciados()).toContain(ANUNCIO_CANCELADA);
  });

  it("tras cancelar, avanzar el reloj no vuelve a armar", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(1500);
    await act(async () => {
      vista.result.current.cancelar();
    });
    const timersTrasCancelar = timersVivos();

    await avanzar(MS_ARMADO + MS_INTERVALO * 4);

    expect(vista.result.current.estado).toBe("idle");
    expect(vista.result.current.progreso).toBe(0);
    expect(textosAnunciados()).not.toContain(ANUNCIO_CUENTA);
    expect(timersVivos()).toBeLessThanOrEqual(timersTrasCancelar);
  });

  it("cancelar() en idle no anuncia nada", async () => {
    const vista = await montar();

    await act(async () => {
      vista.result.current.cancelar();
    });

    expect(vista.result.current.estado).toBe("idle");
    expect(textosAnunciados()).toEqual([]);
  });
});

describe("useArmadoController · R1 fin del armado → cuenta", () => {
  it("a 3000 ms pasa a countdown con progreso 0, 5 s y el anuncio de inicio", async () => {
    const vista = await montar();
    await arrancar(vista);

    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.progreso).toBe(0);
    expect(vista.result.current.restanteSegundos).toBe(SEGUNDOS_CUENTA);
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });

  it("sin háptica la cuenta arranca igual (§7)", async () => {
    mockImpacto.mockImplementation(async () => {
      throw new Error("sin motor háptico");
    });
    const vista = await montar();

    await arrancar(vista);
    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("countdown");
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });
});

describe("useArmadoController · R2/R3 cuenta regresiva", () => {
  it("a 2500 ms de la cuenta va por la mitad y quedan 3 s", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(MS_ARMADO);

    await avanzar(MS_CUENTA / 2);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.progreso).toBe(0.5);
    expect(vista.result.current.restanteSegundos).toBe(3);
  });

  it("a 4999 ms sigue en cuenta y luego pasa a lista a los 5000", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(MS_ARMADO);

    await avanzar(MS_CUENTA - 1);
    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.restanteSegundos).toBe(1);

    await avanzar(1);
    expect(vista.result.current.estado).toBe("lista");
    expect(vista.result.current.progreso).toBe(1);
    expect(vista.result.current.restanteSegundos).toBe(0);
  });

  it("seguir avanzando el reloj no repite el anuncio ni cambia de estado", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(MS_ARMADO + MS_CUENTA);
    expect(vista.result.current.estado).toBe("lista");

    await avanzar(MS_CUENTA * 2);

    expect(vista.result.current.estado).toBe("lista");
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });

  it("cancelar() durante la cuenta vuelve a idle sin registro", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(MS_ARMADO + 2000);
    expect(vista.result.current.estado).toBe("countdown");

    await act(async () => {
      vista.result.current.cancelar();
    });

    expect(vista.result.current.estado).toBe("idle");
    expect(vista.result.current.progreso).toBe(0);
    expect(vista.result.current.restanteSegundos).toBe(SEGUNDOS_CUENTA);
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA, ANUNCIO_CANCELADA]);
  });
});

describe("useArmadoController · R6 un solo flujo a la vez", () => {
  it("iniciar() dos veces no reinicia el conteo", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(2000);

    await arrancar(vista);
    await avanzar(1000);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.restanteSegundos).toBe(SEGUNDOS_CUENTA);
  });

  it("iniciar() dos veces no duplica intervalos ni vibraciones de inicio", async () => {
    const vista = await montar();
    const timersEnReposo = timersVivos();
    await arrancar(vista);
    const lucesTrasPrimero = llamadasDeVibracion("light");

    await arrancar(vista);
    await arrancar(vista);

    expect(llamadasDeVibracion("light")).toBe(lucesTrasPrimero);
    expect(timersVivos()).toBe(timersEnReposo + 1);
  });

  it("iniciar() en countdown no reinicia la cuenta ni repite el anuncio", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(MS_ARMADO + 1000);

    await arrancar(vista);
    await avanzar(1000);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.restanteSegundos).toBe(3);
    expect(textosAnunciados()).toHaveLength(1);
  });

  it("iniciar() en lista no vuelve a contar ni repite el anuncio", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(MS_ARMADO + MS_CUENTA);

    await arrancar(vista);
    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("lista");
    expect(textosAnunciados()).toHaveLength(1);
  });
});

describe("useArmadoController · R5 alternativa accesible", () => {
  it("armarConBoton() desde idle arranca directo la cuenta", async () => {
    const vista = await montar();

    await armarConBoton(vista);

    expect(vista.result.current.estado).toBe("countdown");
    expect(vista.result.current.progreso).toBe(0);
    expect(vista.result.current.restanteSegundos).toBe(SEGUNDOS_CUENTA);
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });

  it("la cuenta del botón corre con su intervalo y llega a lista", async () => {
    const vista = await montar();

    await armarConBoton(vista);
    await avanzar(MS_CUENTA);

    expect(vista.result.current.estado).toBe("lista");
    expect(vista.result.current.progreso).toBe(1);
  });

  it("armarConBoton() durante arming no adelanta el armado", async () => {
    const vista = await montar();
    await arrancar(vista);
    await avanzar(500);

    await armarConBoton(vista);

    expect(vista.result.current.estado).toBe("arming");
    expect(textosAnunciados()).toEqual([]);
  });
});

describe("useArmadoController · R8 volver al inicio", () => {
  it("volverAlInicio() desde lista vuelve a idle", async () => {
    const vista = await montar();
    await armarConBoton(vista);
    await avanzar(MS_CUENTA);

    await act(async () => {
      vista.result.current.volverAlInicio();
    });

    expect(vista.result.current.estado).toBe("idle");
    expect(vista.result.current.progreso).toBe(0);
    expect(vista.result.current.restanteSegundos).toBe(SEGUNDOS_CUENTA);
  });

  it("volverAlInicio() desde idle no hace nada", async () => {
    const vista = await montar();

    await act(async () => {
      vista.result.current.volverAlInicio();
    });

    expect(vista.result.current.estado).toBe("idle");
  });

  it("tras volver se puede armar de nuevo con el gesto", async () => {
    const vista = await montar();
    await armarConBoton(vista);
    await avanzar(MS_CUENTA);
    await act(async () => {
      vista.result.current.volverAlInicio();
    });

    await arrancar(vista);
    await avanzar(MS_ARMADO);

    expect(vista.result.current.estado).toBe("countdown");
  });
});

describe("useArmadoController · R7 desmontaje", () => {
  it("desmontar en arming cancela el intervalo del armado", async () => {
    const vista = await renderHook(() => useArmadoController());
    vistaAbierta = null;
    await act(async () => {});
    await arrancar(vista);
    await avanzar(1000);
    const finDelArmado = jest.now() + MS_ARMADO;

    await vista.unmount();

    // Ni al llegar a los 3000 ms del gesto el armado sigue vivo (R7).
    await avanzar(MS_ARMADO);
    expect(jest.now()).toBeGreaterThanOrEqual(finDelArmado);
    expect(textosAnunciados()).toEqual([]);
  });

  it("desmontar en countdown detiene la cuenta", async () => {
    const vista = await renderHook(() => useArmadoController());
    vistaAbierta = null;
    await act(async () => {});
    await arrancar(vista);
    await avanzar(MS_ARMADO + 1000);

    await vista.unmount();

    await avanzar(MS_CUENTA);
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA]);
  });

  it("desmontar en idle no deja el intervalo encendido", async () => {
    const vista = await renderHook(() => useArmadoController());
    vistaAbierta = null;
    await act(async () => {});

    await vista.unmount();
    await avanzar(MS_ARMADO);

    expect(textosAnunciados()).toEqual([]);
  });

  it("desmontar retira la suscripción de AppState", async () => {
    const app = setupAppState();
    await montar();
    expect(app.remove).not.toHaveBeenCalled();

    /* El cleanup de efectos pasivos se difiere hasta el siguiente `act`. */
    await desmontar();

    expect(app.remove).toHaveBeenCalledTimes(1);
  });
});

describe("useArmadoController · §7 segundo plano", () => {
  it("la app pasa a segundo plano durante arming → idle, progreso 0 y aviso de cancelación", async () => {
    const app = setupAppState();
    const vista = await montar();
    await arrancar(vista);
    await avanzar(1500);
    expect(vista.result.current.estado).toBe("arming");
    expect(vista.result.current.progreso).toBe(0.5);

    await act(async () => {
      app.emitir("background");
    });

    expect(vista.result.current.estado).toBe("idle");
    expect(vista.result.current.progreso).toBe(0);
    expect(textosAnunciados()).toEqual([ANUNCIO_CANCELADA]);
  });

  it("volver a primer plano no cancela nada", async () => {
    const app = setupAppState();
    const vista = await montar();
    await arrancar(vista);

    await act(async () => {
      app.emitir("active");
    });

    expect(vista.result.current.estado).toBe("arming");
    expect(textosAnunciados()).toEqual([]);
  });

  it("pasar a segundo plano durante la cuenta la cancela (spec R7)", async () => {
    const app = setupAppState();
    const vista = await montar();
    await arrancar(vista);
    await avanzar(MS_ARMADO + 2000);
    expect(vista.result.current.estado).toBe("countdown");

    await act(async () => {
      app.emitir("background");
    });

    expect(vista.result.current.estado).toBe("idle");
    expect(vista.result.current.restanteSegundos).toBe(SEGUNDOS_CUENTA);
    expect(textosAnunciados()).toEqual([ANUNCIO_CUENTA, ANUNCIO_CANCELADA]);
  });
});
