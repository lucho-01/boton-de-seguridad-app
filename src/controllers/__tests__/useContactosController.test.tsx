/**
 * Spec M4 · controlador de contactos (`src/controllers/useContactosController.ts`).
 *
 * El repositorio se inyecta como un doble en memoria: sin SQLite ni red.
 * El controlador es lo que se prueba.
 */

import { act, renderHook, type RenderHookResult } from "@testing-library/react-native";

import {
  useContactosController,
  type ContactosController,
  type ContactoConfianza,
} from "@/controllers/useContactosController";

const AHORA = new Date("2026-11-14T10:00:00.000Z");

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

class RepositorioEnMemoria {
  private contactos: ContactoConfianza[];

  constructor(inicial: ContactoConfianza[] = []) {
    this.contactos = [...inicial];
  }

  async listar(): Promise<ContactoConfianza[]> {
    return this.contactos.filter((c) => c.deleted === 0);
  }

  async obtenerPorId(id: string): Promise<ContactoConfianza | null> {
    return this.contactos.find((c) => c.id === id) ?? null;
  }

  async guardar(contacto: ContactoConfianza): Promise<ContactoConfianza> {
    const indice = this.contactos.findIndex((c) => c.id === contacto.id);
    if (indice >= 0) {
      this.contactos[indice] = contacto;
    } else {
      this.contactos.push(contacto);
    }
    return contacto;
  }

  async marcarBorrado(id: string, ahora: Date): Promise<void> {
    const contacto = this.contactos.find((c) => c.id === id);
    if (contacto) {
      contacto.deleted = 1;
      contacto.deleted_at = ahora.toISOString();
      contacto.pending = 1;
      contacto.updated_at = ahora.toISOString();
    }
  }

  async marcarPrincipal(id: string, ahora: Date): Promise<void> {
    const contacto = this.contactos.find((c) => c.id === id);
    if (contacto) {
      this.contactos.forEach((c) => {
        c.principal = c.id === id ? 1 : 0;
        c.updated_at = ahora.toISOString();
        c.pending = 1;
      });
    }
  }
}

type VistaDelHook = RenderHookResult<ContactosController, object>;

function montar(inicial: ContactoConfianza[] = []): Promise<VistaDelHook> {
  const repositorio = new RepositorioEnMemoria(inicial);
  const vista = renderHook(() => useContactosController(repositorio));
  return vista as unknown as Promise<VistaDelHook>;
}

async function guardar(
  vista: VistaDelHook,
  datos: { nombre: string; telefono: string; parentesco: string; principal: number },
  id?: string,
) {
  const resultado = await vista.result.current.guardar(datos, id);
  await act(async () => {});
  return resultado;
}

describe("useContactosController", () => {
  it("arranca con lista vacía, cargando true y sin aviso", async () => {
    const vista = await montar();
    await act(async () => {});

    expect(vista.result.current.contactos).toEqual([]);
    expect(vista.result.current.cargando).toBe(false);
    expect(vista.result.current.puedeAgregar).toBe(true);
    expect(vista.result.current.aviso).toBeNull();
  });

  it("carga contactos iniciales ordenados por nombre", async () => {
    const inicial = [
      contactoDePrueba({ id: "b", nombre: "Zara", telefono: "3000000002" }),
      contactoDePrueba({ id: "a", nombre: "ana", telefono: "3000000001" }),
    ];
    const vista = await montar(inicial);
    await act(async () => {});

    expect(vista.result.current.contactos.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("agrega un contacto nuevo y muestra aviso", async () => {
    const vista = await montar();

    const resultado = await guardar(vista, {
      nombre: "Juan Pérez",
      telefono: "3001234567",
      parentesco: "Hermano",
      principal: 0,
    });

    expect(resultado.ok).toBe(true);
    expect((resultado as { ok: true; mensaje: string }).mensaje).toBe("Contacto guardado.");
    expect(vista.result.current.contactos).toHaveLength(1);
    expect(vista.result.current.contactos[0].nombre).toBe("Juan Pérez");
    expect(vista.result.current.aviso).toBe("Contacto guardado.");
  });

  it("rechaza teléfono inválido y no guarda nada", async () => {
    const vista = await montar();

    const resultado = await guardar(vista, {
      nombre: "Juan Pérez",
      telefono: "123",
      parentesco: "Hermano",
      principal: 0,
    });

    expect(resultado.ok).toBe(false);
    const errores = (
      resultado as {
        ok: false;
        errores: { campo: string; mensaje: string }[];
      }
    ).errores;
    expect(errores).toHaveLength(1);
    expect(errores[0].campo).toBe("telefono");
    expect(vista.result.current.contactos).toHaveLength(0);
  });

  it("rechaza nombre vacío", async () => {
    const vista = await montar();

    const resultado = await guardar(vista, {
      nombre: "",
      telefono: "3001234567",
      parentesco: "Hermano",
      principal: 0,
    });

    expect(resultado.ok).toBe(false);
    const erroresNombre = (
      resultado as {
        ok: false;
        errores: { campo: string; mensaje: string }[];
      }
    ).errores;
    expect(erroresNombre[0].campo).toBe("nombre");
  });

  it("rechaza teléfono duplicado", async () => {
    const inicial = [contactoDePrueba({ id: "otro", nombre: "Otra", telefono: "3001234567" })];
    const vista = await montar(inicial);

    const resultado = await guardar(vista, {
      nombre: "Juan",
      telefono: "3001234567",
      parentesco: "Hermano",
      principal: 0,
    });

    expect(resultado.ok).toBe(false);
    const erroresDuplicado = (
      resultado as {
        ok: false;
        errores: { campo: string; mensaje: string }[];
      }
    ).errores;
    expect(erroresDuplicado[0].campo).toBe("telefono");
    expect(erroresDuplicado[0].mensaje).toBe("Ese número ya está entre tus contactos.");
  });

  it("rechaza sexto contacto cuando ya hay 5", async () => {
    const inicial = Array.from({ length: 5 }, (_, i) =>
      contactoDePrueba({ id: `c${i}`, nombre: `C${i}`, telefono: `300000000${i}` }),
    );
    const vista = await montar(inicial);

    expect(vista.result.current.puedeAgregar).toBe(false);

    const resultado = await guardar(vista, {
      nombre: "Sexto",
      telefono: "3009999999",
      parentesco: "Amigo",
      principal: 0,
    });

    expect(resultado.ok).toBe(false);
    const erroresLímite = (
      resultado as {
        ok: false;
        errores: { campo: string; mensaje: string }[];
      }
    ).errores;
    expect(erroresLímite[0].mensaje).toBe("No puedes tener más de 5 contactos de confianza.");
    expect(vista.result.current.contactos).toHaveLength(5);
  });

  it("edita un contacto existente y muestra aviso", async () => {
    const inicial = [
      contactoDePrueba({
        id: "c1",
        nombre: "Viejo",
        telefono: "3000000001",
        parentesco: "Tío",
      }),
    ];
    const vista = await montar(inicial);

    const resultado = await guardar(
      vista,
      { nombre: "Nuevo", telefono: "3009999999", parentesco: "Madre", principal: 0 },
      "c1",
    );

    expect(resultado.ok).toBe(true);
    expect((resultado as { ok: true; mensaje: string }).mensaje).toBe("Contacto actualizado.");
    expect(vista.result.current.contactos[0].nombre).toBe("Nuevo");
    expect(vista.result.current.contactos[0].telefono).toBe("3009999999");
    expect(vista.result.current.contactos[0].parentesco).toBe("Madre");
    expect(vista.result.current.aviso).toBe("Contacto actualizado.");
  });

  it("borra un contacto lógicamente y muestra aviso", async () => {
    const inicial = [contactoDePrueba({ id: "c1", nombre: "Borrarme", telefono: "3000000001" })];
    const vista = await montar(inicial);

    const borrado = await vista.result.current.eliminar("c1");
    await act(async () => {});

    expect(borrado).toBe(true);
    expect(vista.result.current.contactos).toHaveLength(0);
    expect(vista.result.current.aviso).toBe("Contacto eliminado.");
  });

  it("eliminar devuelve false si el contacto no existe", async () => {
    const vista = await montar();

    const borrado = await vista.result.current.eliminar("inexistente");
    await act(async () => {});

    expect(borrado).toBe(false);
  });

  it("puedeAgregar es false con 5 contactos", async () => {
    const inicial = Array.from({ length: 5 }, (_, i) =>
      contactoDePrueba({ id: `c${i}`, nombre: `C${i}`, telefono: `300000000${i}` }),
    );
    const vista = await montar(inicial);

    expect(vista.result.current.puedeAgregar).toBe(false);
  });

  it("limpiarAviso borra el aviso", async () => {
    const vista = await montar();

    await guardar(vista, {
      nombre: "Juan",
      telefono: "3001234567",
      parentesco: "Hermano",
      principal: 0,
    });
    expect(vista.result.current.aviso).toBe("Contacto guardado.");

    vista.result.current.limpiarAviso();
    await act(async () => {});

    expect(vista.result.current.aviso).toBeNull();
  });

  it("obtenerContacto devuelve null si no existe", async () => {
    const vista = await montar();

    expect(vista.result.current.obtenerContacto("no-existe")).toBeNull();
  });

  it("obtenerContacto devuelve el contacto por id", async () => {
    const inicial = [contactoDePrueba({ id: "c1", nombre: "Ana", telefono: "3001112233" })];
    const vista = await montar(inicial);

    const contacto = vista.result.current.obtenerContacto("c1");

    expect(contacto?.nombre).toBe("Ana");
    expect(contacto?.telefono).toBe("3001112233");
  });
});
