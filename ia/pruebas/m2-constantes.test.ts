/**
 * Regresión de las constantes y del tiempo inyectado de M2
 * (spec `docs/specs/m2-boton-sos-long-press.md`, R1 y R4).
 *
 * Lee el archivo con `fs` desde la raíz: no importa el módulo, así la prueba
 * sigue siendo una evidencia de las restricciones de la IA (tiempo inyectado y
 * umbral del contrato) aunque cambie el entorno de Jest.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();

/** Ruta del servicio puro del armado. */
const SERVICIO = join(RAIZ, "src", "services", "armadoSos.ts");

/** Ruta del anillo de progreso de la vista SOS. */
const ANILLO = join(RAIZ, "src", "components", "AnilloProgreso.tsx");

const fuente = readFileSync(SERVICIO, "utf8");

describe("M2 · R1 el umbral del armado es 3000 ms", () => {
  it("declara MS_ARMADO = 3000", () => {
    expect(fuente).toMatch(/export const MS_ARMADO = 3000;/);
  });

  it("evaluarArmado usa MS_ARMADO como duración por defecto", () => {
    expect(fuente).toMatch(/duracionMs(?:: number)? = MS_ARMADO/);
  });

  it("el progreso se recorta con Math.min y Math.max a [0, 1]", () => {
    expect(fuente).toMatch(/Math\.min\(1,/);
    expect(fuente).toMatch(/Math\.max\(0,/);
  });
});

describe("M2 · R4 el tiempo se inyecta, no se lee del reloj", () => {
  it("el servicio no usa Date.now()", () => {
    expect(fuente).not.toContain("Date.now()");
  });

  it("el servicio no crea fechas por su cuenta (new Date)", () => {
    expect(fuente).not.toContain("new Date(");
  });

  it("el servicio no usa Math.random()", () => {
    expect(fuente).not.toContain("Math.random(");
  });

  it("recibe `inicio` y `ahora` por parámetro", () => {
    expect(fuente).toMatch(/inicio: Date/);
    expect(fuente).toMatch(/ahora: Date/);
  });
});

describe("M2 · el anillo deriva su duración de MS_ARMADO", () => {
  const anillo = readFileSync(ANILLO, "utf8");

  it("importa MS_ARMADO del servicio", () => {
    expect(anillo).toMatch(/import\s*\{[^}]*MS_ARMADO[^}]*\}\s*from\s*"@\/services\/armadoSos"/);
  });

  it("define su duración a partir de MS_ARMADO", () => {
    expect(anillo).toMatch(/DURACION_ANILLO_MS\s*=\s*MS_ARMADO\s*;/);
  });

  it("no repite el umbral como literal propio (3000)", () => {
    expect(anillo).not.toMatch(/\b3000\b/);
    expect(anillo).not.toMatch(/\b3_000\b/);
  });
});
