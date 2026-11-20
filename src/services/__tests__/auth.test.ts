/**
 * Pruebas del servicio puro `src/services/auth.ts` (spec M1 · R1–R3).
 *
 * No toca hardware, red ni SQLite. Todos los textos son en español.
 */

import {
  ERROR_CAMPOS_VACIOS,
  ERROR_CORREO_INVALIDO,
  ERROR_CONTRASENA_CORTA,
  validarIngreso,
  validarRegistro,
} from "../auth";

describe("servicio auth · validarRegistro", () => {
  it("rechaza el correo vacío", () => {
    const resultado = validarRegistro("", "Pass1234");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CORREO_INVALIDO);
  });

  it("rechaza el correo sin @", () => {
    const resultado = validarRegistro("correosincorreo.com", "Pass1234");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CORREO_INVALIDO);
  });

  it("rechaza el correo con @ pero sin dominio", () => {
    const resultado = validarRegistro("usuario@", "Pass1234");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CORREO_INVALIDO);
  });

  it("rechaza la contraseña corta (menos de 8)", () => {
    const resultado = validarRegistro("persona@ejemplo.com", "Pass1");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CONTRASENA_CORTA);
  });

  it("rechaza la contraseña vacía", () => {
    const resultado = validarRegistro("persona@ejemplo.com", "");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CONTRASENA_CORTA);
  });

  it("acepta correo válido y contraseña de 8 o más", () => {
    const resultado = validarRegistro("persona@ejemplo.com", "Pass1234");
    expect(resultado.ok).toBe(true);
    expect(resultado.error).toBeUndefined();
  });

  it("acepta contraseña de exactamente 8 caracteres", () => {
    const resultado = validarRegistro("persona@ejemplo.com", "abc12345");
    expect(resultado.ok).toBe(true);
    expect(resultado.error).toBeUndefined();
  });
});

describe("servicio auth · validarIngreso", () => {
  it("rechaza el correo vacío", () => {
    const resultado = validarIngreso("", "Pass1234");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CAMPOS_VACIOS);
  });

  it("rechaza la contraseña vacía", () => {
    const resultado = validarIngreso("persona@ejemplo.com", "");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CAMPOS_VACIOS);
  });

  it("rechaza ambos campos vacíos", () => {
    const resultado = validarIngreso("", "");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(ERROR_CAMPOS_VACIOS);
  });

  it("acepta correo y contraseña no vacíos", () => {
    const resultado = validarIngreso("persona@ejemplo.com", "Pass1234");
    expect(resultado.ok).toBe(true);
    expect(resultado.error).toBeUndefined();
  });
});
