/**
 * Pruebas rápidas del módulo de tokens visuales (`src/components/tema.ts`).
 *
 * Valida que existan los grupos `COLOR`, `ESPACIO` y `RADIO`, que los colores
 * sean hexadecimales válidos y que `SOMBRA_TARJETA` tenga las propiedades
 * necesarias en iOS y Android.
 */

import { COLOR, ESPACIO, RADIO, SOMBRA_TARJETA } from "@/components/tema";

const PATRON_HEX = /^#[0-9A-Fa-f]{6}$/;

function esColorHex(valor: string): boolean {
  return PATRON_HEX.test(valor);
}

describe("tema · tokens visuales", () => {
  it("expone COLOR, ESPACIO y RADIO", () => {
    expect(COLOR).toBeDefined();
    expect(ESPACIO).toBeDefined();
    expect(RADIO).toBeDefined();
  });

  it("todos los valores de COLOR son hex válidos", () => {
    const invalidos: string[] = [];
    for (const clave of Object.keys(COLOR) as Array<keyof typeof COLOR>) {
      const valor = COLOR[clave];
      if (typeof valor !== "string" || !esColorHex(valor)) {
        invalidos.push(clave);
      }
    }
    expect({ invalidos }).toEqual({ invalidos: [] });
  });

  it("SOMBRA_TARJETA tiene shadow y elevation", () => {
    expect(SOMBRA_TARJETA.shadowOpacity).toBeGreaterThan(0);
    expect(SOMBRA_TARJETA.shadowRadius).toBeGreaterThan(0);
    expect(SOMBRA_TARJETA.elevation).toBeGreaterThan(0);
    expect(SOMBRA_TARJETA.shadowColor).toMatch(PATRON_HEX);
  });

  it("los espacios son números positivos", () => {
    for (const clave of Object.keys(ESPACIO) as Array<keyof typeof ESPACIO>) {
      const valor = ESPACIO[clave];
      expect(typeof valor).toBe("number");
      expect(valor).toBeGreaterThan(0);
    }
  });

  it("los radios son números positivos", () => {
    for (const clave of Object.keys(RADIO) as Array<keyof typeof RADIO>) {
      const valor = RADIO[clave];
      expect(typeof valor).toBe("number");
      expect(valor).toBeGreaterThan(0);
    }
  });
});
