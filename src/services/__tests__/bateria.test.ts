/**
 * Spec M9 · servicio puro de batería (`src/services/batería.ts`).
 *
 * Reglas R1-R6: validación de porcentaje (0-100) y formateo con "%".
 * Sin hardware, red ni SQLite. Todo se pasa por parámetro.
 */

import {
  formatearBateria,
  validarBateria,
  LIMITE_BATERIA_MIN,
  LIMITE_BATERIA_MAX,
} from "../bateria";

describe("batería · validarBateria", () => {
  it("porcentaje 0 es válido", () => {
    expect(validarBateria(0)).toEqual({ valido: true });
  });

  it("porcentaje 50 es válido", () => {
    expect(validarBateria(50)).toEqual({ valido: true });
  });

  it("porcentaje 100 es válido", () => {
    expect(validarBateria(100)).toEqual({ valido: true });
  });

  it("porcentaje menor a 0 no es válido", () => {
    expect(validarBateria(-1)).toEqual({
      valido: false,
      error: "El porcentaje de batería debe estar entre 0 y 100",
    });
  });

  it("porcentaje mayor a 100 no es válido", () => {
    expect(validarBateria(101)).toEqual({
      valido: false,
      error: "El porcentaje de batería debe estar entre 0 y 100",
    });
  });
});

describe("batería · formatearBateria", () => {
  it("devuelve el porcentaje entero con el signo de porcentaje", () => {
    expect(formatearBateria(84)).toBe("84%");
  });

  it("redondea valores decimales al entero más cercano", () => {
    expect(formatearBateria(84.6)).toBe("85%");
  });

  it("porcentaje 0 se formatea como '0%'", () => {
    expect(formatearBateria(0)).toBe("0%");
  });

  it("porcentaje 100 se formatea como '100%'", () => {
    expect(formatearBateria(100)).toBe("100%");
  });
});

describe("batería · límites", () => {
  it("LIMITE_BATERIA_MIN es 0", () => {
    expect(LIMITE_BATERIA_MIN).toBe(0);
  });

  it("LIMITE_BATERIA_MAX es 100", () => {
    expect(LIMITE_BATERIA_MAX).toBe(100);
  });
});
