/**
 * Spec M4 · servicio puro de validaciones de contactos (`src/services/contactos.ts`).
 *
 * Servicio puro: sin hardware, red ni SQLite. El tiempo se inyecta (`ahora: Date`).
 * Las constantes de texto se importan del servicio y las pruebas las usan tal
 * cual, sin inventar mensajes.
 */

import {
  crearContactoNuevo,
  contactoParaFormulario,
  ordenarPorNombre,
  actualizarCampos,
  validarContacto,
  ERROR_LIMITE_ALCANZADO,
  ERROR_NOMBRE_VACIO,
  ERROR_TELEFONO_DUPLICADO,
  ERROR_TELEFONO_INVALIDO,
  type ContactoConfianza,
  type DatosListos,
} from "../contactos";

const AHORA = new globalThis.Date("2026-11-14T10:00:00.000Z");

/** Crea un contacto de prueba con los campos dados y el resto por defecto. */
function contactoDePrueba(parciales: {
  id: string;
  nombre: string;
  telefono: string;
  parentesco?: string | null;
}): ContactoConfianza {
  return {
    id: parciales.id,
    nombre: parciales.nombre,
    telefono: parciales.telefono,
    parentesco: parciales.parentesco ?? null,
    remote_id: null,
    created_at: AHORA.toISOString(),
    updated_at: AHORA.toISOString(),
    deleted_at: null,
    pending: 1,
    deleted: 0,
    principal: 0,
  };
}

/** Contexto válido para `validarContacto` con cero contactos existentes. */
function contextoValido(
  sobreescritos: Partial<{
    nombre: string;
    telefono: string;
    parentesco: string;
    idOriginal: string | null;
    existentes: ContactoConfianza[];
    principal: number;
  }> = {},
): ReturnType<typeof validarContacto> {
  const ahora = new globalThis.Date(AHORA.getTime());
  return validarContacto({
    nombre: sobreescritos.nombre ?? "Juan Pérez",
    telefono: sobreescritos.telefono ?? "3001234567",
    parentesco: sobreescritos.parentesco ?? "Hermano",
    idOriginal: sobreescritos.idOriginal ?? null,
    existentes: sobreescritos.existentes ?? [],
    principal: sobreescritos.principal ?? 0,
    ahora,
  });
}

describe("contactos · validarContacto", () => {
  it("acepta un contacto nuevo válido", () => {
    const resultado = contextoValido();

    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
    expect(resultado.datos).toEqual({
      nombre: "Juan Pérez",
      telefono: "3001234567",
      parentesco: "Hermano",
      principal: 0,
    });
  });

  it("rechaza teléfono de 9 dígitos", () => {
    const resultado = contextoValido({ telefono: "300123456" });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].campo).toBe("telefono");
    expect(resultado.errores[0].mensaje).toBe(ERROR_TELEFONO_INVALIDO);
  });

  it("rechaza teléfono de 11 dígitos", () => {
    const resultado = contextoValido({ telefono: "30012345678" });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].campo).toBe("telefono");
    expect(resultado.errores[0].mensaje).toBe(ERROR_TELEFONO_INVALIDO);
  });

  it("rechaza teléfono con letras", () => {
    const resultado = contextoValido({ telefono: "300123456a" });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].campo).toBe("telefono");
    expect(resultado.errores[0].mensaje).toBe(ERROR_TELEFONO_INVALIDO);
  });

  it("rechaza teléfono vacío", () => {
    const resultado = contextoValido({ telefono: "" });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].campo).toBe("telefono");
    expect(resultado.errores[0].mensaje).toBe(ERROR_TELEFONO_INVALIDO);
  });

  it("rechaza nombre vacío", () => {
    const resultado = contextoValido({ nombre: "" });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].campo).toBe("nombre");
    expect(resultado.errores[0].mensaje).toBe(ERROR_NOMBRE_VACIO);
  });

  it("rechaza nombre solo espacios", () => {
    const resultado = contextoValido({ nombre: "   " });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].campo).toBe("nombre");
    expect(resultado.errores[0].mensaje).toBe(ERROR_NOMBRE_VACIO);
  });

  it("rechaza nombre de 41 caracteres", () => {
    const resultado = contextoValido({ nombre: "a".repeat(41) });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].campo).toBe("nombre");
    expect(resultado.errores[0].mensaje).not.toBe(ERROR_NOMBRE_VACIO);
  });

  it("acepta nombre de exactamente 40 caracteres", () => {
    const resultado = contextoValido({ nombre: "a".repeat(40) });

    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
    expect(resultado.datos?.nombre).toBe("a".repeat(40));
  });

  it("acepta parentesco vacío (se guarda como null)", () => {
    const resultado = contextoValido({ parentesco: "" });

    expect(resultado.ok).toBe(true);
    expect(resultado.datos?.parentesco).toBeNull();
  });

  it("acepta parentesco de 40 caracteres", () => {
    const resultado = contextoValido({ parentesco: "a".repeat(40) });

    expect(resultado.ok).toBe(true);
    expect(resultado.datos?.parentesco).toBe("a".repeat(40));
  });

  it("rechaza parentesco de 41 caracteres", () => {
    const resultado = contextoValido({ parentesco: "a".repeat(41) });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0].campo).toBe("parentesco");
  });

  it("rechaza teléfono duplicado entre contactos existentes", () => {
    const existentes = [contactoDePrueba({ id: "otro", nombre: "Otra", telefono: "3001234567" })];
    const resultado = contextoValido({ existentes });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0].campo).toBe("telefono");
    expect(resultado.errores[0].mensaje).toBe(ERROR_TELEFONO_DUPLICADO);
  });

  it("no rechaza el mismo teléfono al editar el contacto que ya lo tiene", () => {
    const existentes = [
      contactoDePrueba({
        id: "mismo",
        nombre: "Mismo",
        telefono: "3001234567",
      }),
    ];
    const resultado = contextoValido({
      idOriginal: "mismo",
      telefono: "3001234567",
      existentes,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it("rechaza agregar un sexto contacto cuando ya hay 5", () => {
    const existentes = Array.from({ length: 5 }, (_, i) =>
      contactoDePrueba({ id: `c${i}`, nombre: `C${i}`, telefono: `300000000${i}` }),
    );
    const resultado = contextoValido({
      telefono: "3009999999",
      existentes,
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0].campo).toBe("telefono");
    expect(resultado.errores[0].mensaje).toBe(ERROR_LIMITE_ALCANZADO);
  });

  it("permite editar un contacto aunque ya haya 5 existentes", () => {
    const existentes = Array.from({ length: 5 }, (_, i) =>
      contactoDePrueba({ id: `c${i}`, nombre: `C${i}`, telefono: `300000000${i}` }),
    );
    const resultado = contextoValido({
      idOriginal: "c0",
      nombre: "C0 editado",
      telefono: "3000000000",
      existentes,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });
});

describe("contactos · crearContactoNuevo", () => {
  it("crea un contacto con UUID, fechas y pending 1", () => {
    const datos: DatosListos = {
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: "Madre",
      principal: 0,
    };
    const contacto = crearContactoNuevo(datos, AHORA);

    expect(contacto.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
    expect(contacto.nombre).toBe("Ana");
    expect(contacto.telefono).toBe("3001112233");
    expect(contacto.parentesco).toBe("Madre");
    expect(contacto.created_at).toBe(AHORA.toISOString());
    expect(contacto.updated_at).toBe(AHORA.toISOString());
    expect(contacto.pending).toBe(1);
    expect(contacto.deleted).toBe(0);
    expect(contacto.remote_id).toBeNull();
  });
});

describe("contactos · actualizarCampos", () => {
  it("actualiza nombre, telefono, parentesco y updated_at", () => {
    const original = contactoDePrueba({
      id: "c1",
      nombre: "Viejo",
      telefono: "3000000001",
      parentesco: "Tío",
    });
    const datos: DatosListos = {
      nombre: "Nuevo",
      telefono: "3009999999",
      parentesco: null,
      principal: 0,
    };
    const despues = new globalThis.Date("2026-11-15T10:00:00.000Z");
    const actualizado = actualizarCampos(original, datos, despues);

    expect(actualizado.id).toBe("c1");
    expect(actualizado.nombre).toBe("Nuevo");
    expect(actualizado.telefono).toBe("3009999999");
    expect(actualizado.parentesco).toBeNull();
    expect(actualizado.updated_at).toBe(despues.toISOString());
    expect(actualizado.pending).toBe(1);
  });
});

describe("contactos · ordenarPorNombre", () => {
  it("ordena alfabéticamente sin distinguir mayúsculas", () => {
    const contactos = [
      contactoDePrueba({ id: "b", nombre: "Zara", telefono: "3000000002" }),
      contactoDePrueba({ id: "a", nombre: "ana", telefono: "3000000001" }),
      contactoDePrueba({ id: "c", nombre: "Carlos", telefono: "3000000003" }),
    ];
    const ordenados = ordenarPorNombre(contactos);

    expect(ordenados.map((c) => c.id)).toEqual(["a", "c", "b"]);
  });
});

describe("contactos · contactoParaFormulario", () => {
  it("convierte un contacto de BD a datos de formulario", () => {
    const contacto = contactoDePrueba({
      id: "c1",
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: "Madre",
    });
    const datos = contactoParaFormulario(contacto);

    expect(datos).toEqual({
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: "Madre",
      principal: 0,
    });
  });

  it("devuelve parentesco vacío cuando es null", () => {
    const contacto = contactoDePrueba({
      id: "c1",
      nombre: "Ana",
      telefono: "3001112233",
      parentesco: null,
    });
    const datos = contactoParaFormulario(contacto);

    expect(datos.parentesco).toBe("");
  });
});
