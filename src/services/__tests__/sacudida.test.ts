/**
 * Spec M7 · servicio puro de detección de sacudida triple.
 *
 * `src/services/sacudida.ts` será creado por el agente `data`. Este test
 * define el contrato que debe cumplir: `muestraAceleracion`, `esPico` y
 * `detectarSacudidaTriple`. El tiempo se inyecta como milisegundos numéricos
 * en cada muestra; nada de `Date.now()` ni `new Date()` aquí.
 */

import {
  detectarSacudidaTriple,
  esPico,
  muestraAceleracion,
  type MuestraAceleracion,
} from "../sacudida";

const UMBRAL = 15;
const VENTANA_MS = 2000;

function muestra(tiempo: number, x: number, y: number, z: number): MuestraAceleracion {
  return { tiempo, x, y, z };
}

describe("sacudida · muestraAceleracion", () => {
  it("3, 4, 5 → magnitud ≈ 7.07 (raiz cuadrada de 50)", () => {
    expect(muestraAceleracion(3, 4, 5)).toBeCloseTo(Math.sqrt(50), 10);
  });

  it("0, 0, 0 → magnitud 0", () => {
    expect(muestraAceleracion(0, 0, 0)).toBe(0);
  });

  it("valores negativos dan magnitud positiva", () => {
    expect(muestraAceleracion(-3, -4, -5)).toBeCloseTo(Math.sqrt(50), 10);
  });

  it("una sola componente dominante da su valor absoluto", () => {
    expect(muestraAceleracion(0, 0, -8)).toBe(8);
  });
});

describe("sacudida · esPico", () => {
  it("magnitud mayor al umbral es pico", () => {
    expect(esPico(muestra(0, 20, 0, 0), UMBRAL)).toBe(true);
  });

  it("magnitud igual al umbral NO es pico (estricto)", () => {
    expect(esPico(muestra(0, 15, 0, 0), UMBRAL)).toBe(false);
  });

  it("magnitud menor al umbral no es pico", () => {
    expect(esPico(muestra(0, 10, 0, 0), UMBRAL)).toBe(false);
  });

  it("magnitud cero nunca es pico con umbral positivo", () => {
    expect(esPico(muestra(0, 0, 0, 0), UMBRAL)).toBe(false);
  });
});

describe("sacudida · detectarSacudidaTriple", () => {
  it("tres picos sobre el umbral dentro de la ventana detectan la sacudida", () => {
    const muestras: MuestraAceleracion[] = [
      muestra(0, 20, 0, 0),
      muestra(500, 5, 0, 0),
      muestra(1000, 20, 0, 0),
      muestra(1500, 5, 0, 0),
      muestra(1900, 20, 0, 0),
    ];
    expect(detectarSacudidaTriple(muestras, UMBRAL, VENTANA_MS)).toBe(true);
  });

  it("menos de tres picos no detecta la sacudida", () => {
    const muestras: MuestraAceleracion[] = [muestra(0, 20, 0, 0), muestra(500, 20, 0, 0)];
    expect(detectarSacudidaTriple(muestras, UMBRAL, VENTANA_MS)).toBe(false);
  });

  it("picos por debajo del umbral no cuentan aunque haya tres lecturas", () => {
    const muestras: MuestraAceleracion[] = [
      muestra(0, 10, 0, 0),
      muestra(500, 10, 0, 0),
      muestra(1000, 10, 0, 0),
    ];
    expect(detectarSacudidaTriple(muestras, UMBRAL, VENTANA_MS)).toBe(false);
  });

  it("tres picos pero fuera de la ventana de tiempo no detectan", () => {
    const muestras: MuestraAceleracion[] = [
      muestra(0, 20, 0, 0),
      muestra(2100, 20, 0, 0),
      muestra(4200, 20, 0, 0),
    ];
    expect(detectarSacudidaTriple(muestras, UMBRAL, VENTANA_MS)).toBe(false);
  });

  it("array vacío no detecta sacudida", () => {
    expect(detectarSacudidaTriple([], UMBRAL, VENTANA_MS)).toBe(false);
  });

  it("exactamente tres picos justo al límite de la ventana detectan", () => {
    const muestras: MuestraAceleracion[] = [
      muestra(0, 20, 0, 0),
      muestra(1000, 20, 0, 0),
      muestra(2000, 20, 0, 0),
    ];
    expect(detectarSacudidaTriple(muestras, UMBRAL, VENTANA_MS)).toBe(true);
  });

  it("cuarto pico extiende la ventana y puede detectar con los dos siguientes", () => {
    const muestras: MuestraAceleracion[] = [
      muestra(0, 20, 0, 0),
      muestra(100, 5, 0, 0),
      muestra(1900, 20, 0, 0),
      muestra(2000, 20, 0, 0),
    ];
    expect(detectarSacudidaTriple(muestras, UMBRAL, VENTANA_MS)).toBe(true);
  });
});
