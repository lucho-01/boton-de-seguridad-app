/**
 * Spec M3 · R1–R3 (`src/services/cuentaRegresiva.ts`).
 *
 * Servicio puro: `inicio` y `ahora` se inyectan como `Date`, sin `Date.now()`
 * ni reloj del sistema. A los 5000 ms la cuenta termina; antes, nunca.
 *
 * Las fechas del caso las construye `fechasDePrueba` con el tiempo falso de
 * Jest (`jest.useFakeTimers({ now })` y `jest.now()`): determinista y sin
 * `new Date()` ni `Date.now()`, que el lint de `src/services/**` prohíbe.
 */

import { MS_CUENTA, evaluarCuenta } from "../cuentaRegresiva";

const MS_INICIO = Date.UTC(2026, 11, 1, 9, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: MS_INICIO });
});

afterEach(() => {
  jest.useRealTimers();
});

/** Fábrica de fechas de prueba a partir del reloj falso del caso. */
const fechasDePrueba = {
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

describe("evaluarCuenta", () => {
  it("expone la duración de 5000 ms (R1)", () => {
    expect(MS_CUENTA).toBe(5000);
  });

  it("a 0 ms: progreso 0, restante 5 y sin completar", () => {
    expect(evaluarCuenta({ inicio: inicio(), ahora: fechasDePrueba.despuesDe(0) })).toEqual({
      transcurridoMs: 0,
      restanteSegundos: 5,
      progreso: 0,
      completada: false,
    });
  });

  it("a 1 ms: el restante sigue en 5 y el progreso es mínimo", () => {
    const evaluacion = evaluarCuenta({
      inicio: inicio(),
      ahora: fechasDePrueba.despuesDe(1),
    });

    expect(evaluacion.restanteSegundos).toBe(5);
    expect(evaluacion.progreso).toBeCloseTo(0.0002, 4);
    expect(evaluacion.completada).toBe(false);
  });

  it("a 4999 ms: restante 1, progreso casi 1 y sin completar", () => {
    const evaluacion = evaluarCuenta({
      inicio: inicio(),
      ahora: fechasDePrueba.despuesDe(4999),
    });

    expect(evaluacion.restanteSegundos).toBe(1);
    expect(evaluacion.progreso).toBeCloseTo(0.9998, 4);
    expect(evaluacion.completada).toBe(false);
  });

  it("a 5000 ms: completada, progreso 1 y restante 0", () => {
    expect(evaluarCuenta({ inicio: inicio(), ahora: fechasDePrueba.despuesDe(5000) })).toEqual({
      transcurridoMs: 5000,
      restanteSegundos: 0,
      progreso: 1,
      completada: true,
    });
  });

  it("a 6000 ms: completada, progreso 1 y restante 0 (nunca negativo)", () => {
    const evaluacion = evaluarCuenta({
      inicio: inicio(),
      ahora: fechasDePrueba.despuesDe(6000),
    });

    expect(evaluacion.completada).toBe(true);
    expect(evaluacion.progreso).toBe(1);
    expect(evaluacion.restanteSegundos).toBe(0);
  });

  it("un `ahora` anterior a `inicio` no produce valores negativos", () => {
    const evaluacion = evaluarCuenta({
      inicio: fechasDePrueba.despuesDe(1000),
      ahora: fechasDePrueba.despuesDe(500),
    });

    expect(evaluacion.transcurridoMs).toBe(0);
    expect(evaluacion.progreso).toBe(0);
    expect(evaluacion.restanteSegundos).toBe(5);
    expect(evaluacion.completada).toBe(false);
  });
});
