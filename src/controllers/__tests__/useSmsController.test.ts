import { act, renderHook } from "@testing-library/react-native";

import { useSmsController } from "@/controllers/useSmsController";
import type { AjustesRepository } from "@/repositories/ajustes";
import type { ContactosRepository } from "@/repositories/contactos";
import type { ContactoConfianza } from "@/services/contactos";
import type { SmsSensor } from "@/sensors/useSms";

class AjustesEnMemoria implements AjustesRepository {
  async obtenerClave(clave: string): Promise<string | null> {
    if (clave === "mensaje_base") {
      return "Necesito ayuda. [enlace de mapa]";
    }
    return null;
  }

  async guardarClave(): Promise<void> {
    return;
  }
}

function contacto(id: string): ContactoConfianza {
  return {
    id,
    nombre: "Contacto",
    telefono: "3001234567",
    parentesco: null,
    remote_id: null,
    created_at: "2026-11-20T00:00:00.000Z",
    updated_at: "2026-11-20T00:00:00.000Z",
    deleted_at: null,
    pending: 0,
    deleted: 0,
    principal: 1,
  };
}

class ContactosEnMemoria implements ContactosRepository {
  constructor(private readonly filas: ContactoConfianza[]) {}

  async listar(): Promise<ContactoConfianza[]> {
    return this.filas;
  }

  async obtenerPorId(): Promise<ContactoConfianza | null> {
    return null;
  }

  async guardar(item: ContactoConfianza): Promise<ContactoConfianza> {
    return item;
  }

  async marcarBorrado(): Promise<void> {
    return;
  }

  async marcarPrincipal(): Promise<void> {
    return;
  }
}

describe("useSmsController · M10", () => {
  it("sin contactos deshabilita el redactor", async () => {
    const sensor: SmsSensor = {
      disponible: true,
      abrirRedactor: async () => true,
    };
    const ajustes = new AjustesEnMemoria();
    const contactos = new ContactosEnMemoria([]);
    const vista = await renderHook(() =>
      useSmsController(
        { activo: true, lat: 4.71, lng: -74.07, bateriaPct: 84 },
        {
          ajustes,
          contactos,
          sensor,
        },
      ),
    );
    await act(async () => {});

    expect(vista.result.current.puedeAbrir).toBe(false);
    expect(vista.result.current.aviso).toContain("Agrega al menos");
  });

  it("sin SMS disponible ofrece copiar y confirma el resultado", async () => {
    const sensor: SmsSensor = {
      disponible: false,
      abrirRedactor: async () => false,
    };
    const copiar = jest.fn(async () => true);
    const ajustes = new AjustesEnMemoria();
    const contactos = new ContactosEnMemoria([]);
    const vista = await renderHook(() =>
      useSmsController(
        { activo: true, lat: null, lng: null, bateriaPct: 72 },
        {
          ajustes,
          contactos,
          sensor,
          portapapeles: { copiar },
        },
      ),
    );
    await act(async () => {});

    expect(vista.result.current.puedeCopiar).toBe(true);
    await act(async () => {
      await vista.result.current.copiarMensaje();
    });

    expect(copiar).toHaveBeenCalledWith(vista.result.current.mensaje);
    expect(vista.result.current.avisoCopia).toContain("Mensaje copiado");
  });

  it("avisa si falla la copia y mantiene el mensaje disponible", async () => {
    const sensor: SmsSensor = {
      disponible: false,
      abrirRedactor: async () => false,
    };
    const ajustes = new AjustesEnMemoria();
    const contactos = new ContactosEnMemoria([]);
    const vista = await renderHook(() =>
      useSmsController(
        { activo: true, lat: null, lng: null, bateriaPct: null },
        {
          ajustes,
          contactos,
          sensor,
          portapapeles: { copiar: async () => false },
        },
      ),
    );
    await act(async () => {});

    await act(async () => {
      await vista.result.current.copiarMensaje();
    });

    expect(vista.result.current.mensaje).toContain("Sin ubicación disponible");
    expect(vista.result.current.avisoCopia).toContain("No se pudo copiar");
  });

  it("con contactos y ubicación abre el redactor", async () => {
    const abrirRedactor = jest.fn(async () => true);
    const sensor: SmsSensor = {
      disponible: true,
      abrirRedactor,
    };
    const ajustes = new AjustesEnMemoria();
    const contactos = new ContactosEnMemoria([contacto("1")]);
    const vista = await renderHook(() =>
      useSmsController(
        { activo: true, lat: 4.71, lng: -74.07, bateriaPct: 84 },
        {
          ajustes,
          contactos,
          sensor,
        },
      ),
    );
    await act(async () => {});

    expect(vista.result.current.puedeAbrir).toBe(true);
    await act(async () => {
      await vista.result.current.abrirRedactor();
    });
    expect(abrirRedactor).toHaveBeenCalledWith(
      ["3001234567"],
      expect.stringContaining("https://maps.google.com/?q=4.71,-74.07"),
    );
  });
});
