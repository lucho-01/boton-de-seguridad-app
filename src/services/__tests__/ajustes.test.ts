/**
 * Spec M6 · servicio puro de ajustes (`src/services/ajustes.ts`).
 *
 * Sin hardware, red ni SQLite. Solo valida las constantes y la función
 * `validarMensajeBase` contra la especificación aprobada.
 */

import {
  ERROR_ESCRITURA_AJUSTES,
  ERROR_MENSAJE_BASE_LARGO,
  LIMITE_MENSAJE_BASE,
  MENSAJE_AJUSTES_GUARDADOS,
  MENSAJE_AJUSTES_REESTABLECIDOS,
  MENSAJE_BASE_POR_DEFECTO,
  UMBRAL_SACUDIDA_POR_DEFECTO,
  VENTANA_SACUDIDA_POR_DEFECTO,
  clavesAjustes,
  validarMensajeBase,
  valoresPorDefecto,
} from "@/services/ajustes";

describe("validarMensajeBase", () => {
  it("acepta un mensaje de hasta 160 caracteres", () => {
    const mensaje = "a".repeat(160);
    const resultado = validarMensajeBase(mensaje);

    expect(resultado.ok).toBe(true);
  });

  it("rechaza un mensaje de más de 160 caracteres", () => {
    const mensaje = "a".repeat(161);
    const resultado = validarMensajeBase(mensaje);

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_MENSAJE_BASE_LARGO);
  });

  it("acepta el mensaje vacío", () => {
    const resultado = validarMensajeBase("");

    expect(resultado.ok).toBe(true);
  });
});

describe("valoresPorDefecto", () => {
  it("devuelve umbral 15, ventana 2000 y mensaje base por defecto", () => {
    const valores = valoresPorDefecto();

    expect(valores.umbralSacudida).toBe(UMBRAL_SACUDIDA_POR_DEFECTO);
    expect(valores.ventanaSacudida).toBe(VENTANA_SACUDIDA_POR_DEFECTO);
    expect(valores.mensajeBase).toBe(MENSAJE_BASE_POR_DEFECTO);
  });
});

describe("clavesAjustes", () => {
  it("devuelve las tres claves en snake_case", () => {
    expect(clavesAjustes()).toEqual(["umbral_sacudida", "ventana_sacudida", "mensaje_base"]);
  });
});

describe("constantes de texto", () => {
  it("MENSAJE_BASE_POR_DEFECTO tiene el texto esperado", () => {
    expect(MENSAJE_BASE_POR_DEFECTO).toBe(
      "Alerta de seguridad: necesito ayuda. Mi ubicación es [enlace de mapa].",
    );
  });

  it("LIMITE_MENSAJE_BASE es 160", () => {
    expect(LIMITE_MENSAJE_BASE).toBe(160);
  });

  it("UMBRAL_SACUDIDA_POR_DEFECTO es 15", () => {
    expect(UMBRAL_SACUDIDA_POR_DEFECTO).toBe(15);
  });

  it("VENTANA_SACUDIDA_POR_DEFECTO es 2000", () => {
    expect(VENTANA_SACUDIDA_POR_DEFECTO).toBe(2000);
  });

  it("ERROR_MENSAJE_BASE_LARGO tiene el texto esperado", () => {
    expect(ERROR_MENSAJE_BASE_LARGO).toBe("El mensaje base no puede superar los 160 caracteres.");
  });

  it("ERROR_ESCRITURA_AJUSTES tiene el texto esperado", () => {
    expect(ERROR_ESCRITURA_AJUSTES).toBe("No se pudieron guardar los ajustes. Intenta otra vez.");
  });

  it("MENSAJE_AJUSTES_GUARDADOS tiene el texto esperado", () => {
    expect(MENSAJE_AJUSTES_GUARDADOS).toBe("Ajustes guardados.");
  });

  it("MENSAJE_AJUSTES_REESTABLECIDOS tiene el texto esperado", () => {
    expect(MENSAJE_AJUSTES_REESTABLECIDOS).toBe("Ajustes restablecidos a los valores por defecto.");
  });
});
