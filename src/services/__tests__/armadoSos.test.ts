/**
 * Spec M2 · R1 y R4 (`src/services/armadoSos.ts`) y vínculo del anillo con el
 * umbral del armado (`src/components/AnilloProgreso.tsx`).
 *
 * Servicio puro: `inicio` y `ahora` se inyectan como `Date`, sin `Date.now()`
 * ni reloj del sistema. 2999 ms cancela; 3000 ms arma.
 *
 * Las fechas del caso las construye `fechasDePrueba` con el tiempo falso de
 * Jest (`jest.useFakeTimers({ now })` y `jest.now()`): determinista y sin
 * `new Date()` ni `Date.now()`, que el lint de `src/services/**` prohíbe.
 */

import { MS_ARMADO, evaluarArmado, progresoArmado, type EvaluacionArmado } from "../armadoSos";

const MS_INICIO = Date.UTC(2026, 10, 14, 10, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: MS_INICIO });
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Fábrica de fechas de prueba. Mueve el reloj falso del caso y lo restaura,
 * de modo que cada fecha sale de `jest.now()` y no del reloj del sistema.
 */
const fechasDePrueba = {
  /** Instante `ms` después del inicio del caso. */
  despuesDe(ms: number): Date {
    const actual = jest.now();
    jest.setSystemTime(MS_INICIO + ms);
    const fecha = new globalThis.Date(jest.now());
    jest.setSystemTime(actual);
    return fecha;
  },
};

function inicio(): Date {
  return fechasDePrueba.despuesDe(0);
}

describe("armadoSos · R1 la constante del contrato", () => {
  it("el long press dura 3000 ms", () => {
    expect(MS_ARMADO).toBe(3000);
  });
});

describe("armadoSos · R4 progreso con tiempo inyectado", () => {
  it("0 ms → 0", () => {
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(0))).toBe(0);
  });

  it("750, 1500 y 2250 ms → 0.25, 0.5 y 0.75", () => {
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(750))).toBeCloseTo(0.25, 10);
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(1500))).toBe(0.5);
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(2250))).toBeCloseTo(0.75, 10);
  });

  it("2999 ms queda por debajo de 1", () => {
    const progreso = progresoArmado(inicio(), fechasDePrueba.despuesDe(2999));
    expect(progreso).toBeLessThan(1);
    expect(progreso).toBeGreaterThan(0.99);
  });

  it("3000 ms → 1", () => {
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(3000))).toBe(1);
  });

  it("5000 ms se recorta a 1 (min(1, transcurrido / 3000))", () => {
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(5000))).toBe(1);
  });

  it("un `ahora` anterior a `inicio` da 0, nunca negativo", () => {
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(-500))).toBe(0);
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(-3000))).toBe(0);
  });

  it("acepta una duración personalizada", () => {
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(500), 1000)).toBe(0.5);
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(1500), 1000)).toBe(1);
  });

  it("una duración de 0 o negativa ya está completa", () => {
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(0), 0)).toBe(1);
    expect(progresoArmado(inicio(), fechasDePrueba.despuesDe(0), -100)).toBe(1);
  });

  it("la fecha no cambia el reloj del caso: `inicio` es el mismo instante", () => {
    expect(inicio().getTime()).toBe(MS_INICIO);
    expect(jest.now()).toBe(MS_INICIO);
  });
});

describe("armadoSos · R1 evaluarArmado en los umbrales", () => {
  it("0 ms: no completado, progreso 0, faltan 3000", () => {
    expect(evaluarArmado({ inicio: inicio(), ahora: fechasDePrueba.despuesDe(0) })).toEqual({
      completado: false,
      progreso: 0,
      restante_ms: 3000,
    });
  });

  it("1500 ms: no completado, progreso 0.5, faltan 1500", () => {
    expect(evaluarArmado({ inicio: inicio(), ahora: fechasDePrueba.despuesDe(1500) })).toEqual({
      completado: false,
      progreso: 0.5,
      restante_ms: 1500,
    });
  });

  it("2999 ms: no completado, progreso < 1, falta 1 ms", () => {
    const evaluacion: EvaluacionArmado = evaluarArmado({
      inicio: inicio(),
      ahora: fechasDePrueba.despuesDe(2999),
    });
    expect(evaluacion.completado).toBe(false);
    expect(evaluacion.progreso).toBeLessThan(1);
    expect(evaluacion.restante_ms).toBe(1);
  });

  it("3000 ms: completado, progreso 1, restante 0", () => {
    expect(evaluarArmado({ inicio: inicio(), ahora: fechasDePrueba.despuesDe(3000) })).toEqual({
      completado: true,
      progreso: 1,
      restante_ms: 0,
    });
  });

  it("5000 ms: completado, progreso 1 y restante 0 (nunca negativo)", () => {
    const evaluacion = evaluarArmado({ inicio: inicio(), ahora: fechasDePrueba.despuesDe(5000) });
    expect(evaluacion.completado).toBe(true);
    expect(evaluacion.progreso).toBe(1);
    expect(evaluacion.restante_ms).toBe(0);
  });

  it("un `ahora` anterior a `inicio`: progreso 0 y restante completo", () => {
    const evaluacion = evaluarArmado({ inicio: inicio(), ahora: fechasDePrueba.despuesDe(-500) });
    expect(evaluacion.completado).toBe(false);
    expect(evaluacion.progreso).toBe(0);
    expect(evaluacion.restante_ms).toBe(3500);
  });

  it("respeta una duración personalizada", () => {
    const evaluacion = evaluarArmado({
      inicio: inicio(),
      ahora: fechasDePrueba.despuesDe(500),
      duracionMs: 1000,
    });
    expect(evaluacion.completado).toBe(false);
    expect(evaluacion.progreso).toBe(0.5);
    expect(evaluacion.restante_ms).toBe(500);
  });

  it("con duración 0 se considera completa de inmediato", () => {
    const evaluacion = evaluarArmado({
      inicio: inicio(),
      ahora: fechasDePrueba.despuesDe(0),
      duracionMs: 0,
    });
    expect(evaluacion.completado).toBe(true);
    expect(evaluacion.progreso).toBe(1);
    expect(evaluacion.restante_ms).toBe(0);
  });
});
