/**
 * Spec M8 · servicio puro de ubicación y sacudida triple.
 *
 * Prueba `esCoordenadaValida` y `validarCoordenadas` de `ubicacion.ts`,
 * más `muestraAceleracion` y `detectarSacudidaTriple` de `sacudida.ts`.
 * Todo es puro: sin hardware, red ni temporizadores reales.
 */

import { esCoordenadaValida, validarCoordenadas } from "../ubicacion";
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

describe("ubicacion · esCoordenadaValida", () => {
  it("latitud dentro de [-90, 90] y longitud dentro de [-180, 180] es válida", () => {
    expect(esCoordenadaValida(0, 0)).toBe(true);
    expect(esCoordenadaValida(90, 180)).toBe(true);
    expect(esCoordenadaValida(-90, -180)).toBe(true);
    expect(esCoordenadaValida(40.7128, -74.006)).toBe(true);
  });

  it("latitud fuera de rango rechaza", () => {
    expect(esCoordenadaValida(91, 0)).toBe(false);
    expect(esCoordenadaValida(-91, 0)).toBe(false);
  });

  it("longitud fuera de rango rechaza", () => {
    expect(esCoordenadaValida(0, 181)).toBe(false);
    expect(esCoordenadaValida(0, -181)).toBe(false);
  });

  it("ambas fuera de rango rechaza", () => {
    expect(esCoordenadaValida(91, 181)).toBe(false);
    expect(esCoordenadaValida(-91, -181)).toBe(false);
  });
});

describe("ubicacion · validarCoordenadas", () => {
  it("latitud válida, longitud válida y precisión >= 0 es ok", () => {
    const resultado = validarCoordenadas(40.7128, -74.006, 5);
    expect(resultado.valido).toBe(true);
  });

  it("precisión cero es válida", () => {
    const resultado = validarCoordenadas(0, 0, 0);
    expect(resultado.valido).toBe(true);
  });

  it("latitud 91 no es válida", () => {
    const resultado = validarCoordenadas(91, 0, 5);
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBeDefined();
  });

  it("longitud 181 no es válida", () => {
    const resultado = validarCoordenadas(0, 181, 5);
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBeDefined();
  });

  it("precisión negativa no es válida", () => {
    const resultado = validarCoordenadas(0, 0, -1);
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBeDefined();
  });

  it("latitud -91 no es válida", () => {
    const resultado = validarCoordenadas(-91, 0, 5);
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBeDefined();
  });

  it("longitud -181 no es válida", () => {
    const resultado = validarCoordenadas(0, -181, 5);
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBeDefined();
  });
});

describe("ubicacion · muestraAceleracion", () => {
  it("3, 4, 5 -> magnitud ≈ 7.07 (raiz cuadrada de 50)", () => {
    expect(muestraAceleracion(3, 4, 5)).toBeCloseTo(Math.sqrt(50), 10);
  });

  it("0, 0, 0 -> magnitud 0", () => {
    expect(muestraAceleracion(0, 0, 0)).toBe(0);
  });

  it("valores negativos dan magnitud positiva", () => {
    expect(muestraAceleracion(-3, -4, -5)).toBeCloseTo(Math.sqrt(50), 10);
  });

  it("una sola componente dominante da su valor absoluto", () => {
    expect(muestraAceleracion(0, 0, -8)).toBe(8);
  });
});

describe("ubicacion · detectarSacudidaTriple", () => {
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
});

describe("ubicacion · esPico", () => {
  it("magnitud mayor al umbral es pico", () => {
    expect(esPico(muestra(0, 20, 0, 0), UMBRAL)).toBe(true);
  });

  it("magnitud igual al umbral NO es pico (estricto)", () => {
    expect(esPico(muestra(0, 15, 0, 0), UMBRAL)).toBe(false);
  });

  it("magnitud menor al umbral no es pico", () => {
    expect(esPico(muestra(0, 10, 0, 0), UMBRAL)).toBe(false);
  });
});
