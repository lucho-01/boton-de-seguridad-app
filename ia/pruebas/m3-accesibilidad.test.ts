/**
 * Evidencia de las correcciones de accesibilidad de M3 (revisión de seguridad).
 *
 * Lee los componentes con `fs` desde la raíz: no importa el módulo, así la
 * prueba sigue siendo evidencia de las restricciones aunque cambie el entorno
 * de Jest. Comprueba las tres correcciones pedidas:
 *
 * 1. Anuncios repetidos: ninguna live region en lo que cambia en cada tick.
 * 2. Pista muerta: la pista depende del estado y nunca remite al gesto
 *    inalcanzable ni a un botón deshabilitado.
 * 3. Doble toque en Android: acción `activate` con `onAccessibilityAction` y
 *    sin `onAccessibilityTap` (solo iOS).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();

const BOTON_SOS = join(RAIZ, "src", "components", "BotonSos.tsx");
const CUENTA = join(RAIZ, "src", "components", "CuentaRegresiva.tsx");
const CONTENIDO = join(RAIZ, "src", "components", "ContenidoArmado.tsx");
const ALTERNATIVO = join(RAIZ, "src", "components", "BotonAlternativoArmado.tsx");
const HAPTICOS = join(RAIZ, "src", "sensors", "useHaptics.ts");

const botonSos = readFileSync(BOTON_SOS, "utf8");
const cuenta = readFileSync(CUENTA, "utf8");
const contenido = readFileSync(CONTENIDO, "utf8");
const alternativo = readFileSync(ALTERNATIVO, "utf8");
const hapticos = readFileSync(HAPTICOS, "utf8");

/** Quita los comentarios: las comprobaciones miran el código, no la prosa. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("M3 · el lector de pantalla no repite anuncios", () => {
  it("el botón SOS no declara ninguna live region", () => {
    expect(sinComentarios(botonSos)).not.toContain("accessibilityLiveRegion");
  });

  it("la cuenta regresiva no declara ninguna live region", () => {
    expect(sinComentarios(cuenta)).not.toContain("accessibilityLiveRegion");
  });

  it("el contenido solo deja una live region: la del estado final", () => {
    const apariciones = sinComentarios(contenido).match(/accessibilityLiveRegion/g);
    expect(apariciones).toHaveLength(1);
  });

  it("la etiqueta del botón SOS no depende del porcentaje ni de los segundos", () => {
    expect(sinComentarios(botonSos)).toContain("accessibilityLabel={etiquetaDeApariencia(estado)}");
    expect(sinComentarios(botonSos)).not.toContain("restanteSegundos");
  });

  it("el texto «Alerta en X s» solo lo compone la cuenta regresiva", () => {
    expect(sinComentarios(cuenta)).toContain("export function textoCuenta");
    expect(sinComentarios(botonSos)).not.toContain("Alerta en ");
  });
});

describe("M3 · sin pistas accesibles muertas", () => {
  it("la pista del botón SOS depende del estado", () => {
    expect(sinComentarios(botonSos)).toContain("accessibilityHint={pistaDeEstado(estado)}");
  });

  it("el botón de cancelar no remite al gesto de deslizar", () => {
    expect(sinComentarios(cuenta)).toContain("pistaAccesible={PISTA_CANCELAR}");
    expect(sinComentarios(cuenta)).not.toContain("PISTA_DESLIZAR");
  });

  it("el botón alternativo solo lleva pista cuando está disponible", () => {
    expect(sinComentarios(alternativo)).toContain(
      "accessibilityHint={pistaDeDisponibilidad(disponible)}",
    );
  });
});

describe("M3 · doble toque en Android", () => {
  it("el botón SOS expone la acción «activate» y la atiende", () => {
    expect(sinComentarios(botonSos)).toContain("accessibilityActions={accionesAccesibles(estado)}");
    expect(sinComentarios(botonSos)).toContain("onAccessibilityAction");
    expect(sinComentarios(botonSos)).toContain('actionName === "activate"');
  });

  it("no usa onAccessibilityTap: esa es solo de iOS", () => {
    expect(sinComentarios(botonSos)).not.toContain("onAccessibilityTap");
  });
});

describe("M3 · observaciones de la re-revisión de seguridad", () => {
  it("el porcentaje del armado tiene una sola fuente: el texto del botón SOS", () => {
    expect(sinComentarios(contenido)).not.toContain("porcentajeArmado");
    expect(sinComentarios(contenido)).not.toContain("%");
  });

  it("el gesto de deslizar se oculta entero, con sus textos descendientes", () => {
    expect(sinComentarios(cuenta)).toContain('importantForAccessibility="no-hide-descendants"');
    expect(sinComentarios(cuenta)).toContain("accessibilityElementsHidden");
  });

  it("no hay vibración de sondeo: la háptica solo suena al iniciar o cancelar", () => {
    expect(sinComentarios(hapticos)).not.toContain("sondear");
    expect(sinComentarios(hapticos)).not.toContain("disponibleRef");
  });
});
