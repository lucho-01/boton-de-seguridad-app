import { ApiError } from "@/api";
import type { AlertaApi, ContactoApi, PaginaAlertas, PaginaContactos } from "@/api";
import type { Alerta, ContactoConfianza } from "@/models";
import type { AlertasSyncRepository } from "@/repositories/alertas";
import type { AjustesRepository } from "@/repositories/ajustes";
import type { ContactosSyncRepository } from "@/repositories/contactos";
import {
  CuentaSincronizacionDiferenteError,
  sincronizarDatos,
  type ClienteSincronizacion,
  type DependenciasSincronizacion,
} from "@/sync/sincronizar";

const AHORA = "2026-11-20T22:00:00.000Z";
const CONTACTO: ContactoConfianza = {
  id: "contacto-1",
  nombre: "Ana",
  telefono: "3001112233",
  parentesco: "Madre",
  remote_id: null,
  created_at: AHORA,
  updated_at: AHORA,
  deleted_at: null,
  pending: 1,
  deleted: 0,
  principal: 1,
};
const ALERTA: Alerta = {
  id: "alerta-1",
  remote_id: null,
  created_at: AHORA,
  updated_at: AHORA,
  deleted_at: null,
  pending: 1,
  deleted: 0,
  lat: 4.71,
  lng: -74.07,
  precision_m: 12,
  bateria_pct: 84,
  estado: "mensaje_preparado",
  creada_en: AHORA,
};

class AjustesEnMemoria implements AjustesRepository {
  readonly valores = new Map<string, string>();

  async obtenerClave(clave: string): Promise<string | null> {
    return this.valores.get(clave) ?? null;
  }

  async guardarClave(clave: string, valor: string): Promise<void> {
    this.valores.set(clave, valor);
  }
}

class ContactosEnMemoria implements ContactosSyncRepository {
  readonly filas: ContactoConfianza[];

  constructor(filas: ContactoConfianza[] = []) {
    this.filas = [...filas];
  }

  async listar(): Promise<ContactoConfianza[]> {
    return this.filas.filter((fila) => fila.deleted === 0);
  }

  async listarPendientes(): Promise<ContactoConfianza[]> {
    return this.filas.filter((fila) => fila.pending === 1);
  }

  async obtenerPorId(id: string): Promise<ContactoConfianza | null> {
    return this.filas.find((fila) => fila.id === id && fila.deleted === 0) ?? null;
  }

  async guardar(contacto: ContactoConfianza): Promise<ContactoConfianza> {
    this.reemplazar(contacto);
    return contacto;
  }

  async guardarDesdeApi(contacto: ContactoConfianza): Promise<void> {
    const local = this.filas.find((fila) => fila.id === contacto.id);
    if (local === undefined || contacto.updated_at > local.updated_at) {
      this.reemplazar(contacto);
    }
  }

  async confirmarSubida(contacto: ContactoConfianza, updatedAtLocal: string): Promise<void> {
    const local = this.filas.find((fila) => fila.id === contacto.id);
    if (local !== undefined && local.updated_at === updatedAtLocal && local.pending === 1) {
      this.reemplazar(contacto);
    }
  }

  async marcarSincronizado(id: string, updatedAtLocal: string): Promise<void> {
    const local = this.filas.find((fila) => fila.id === id && fila.updated_at === updatedAtLocal);
    if (local !== undefined) {
      local.remote_id = id;
      local.pending = 0;
    }
  }

  async marcarBorrado(id: string, ahora: Date): Promise<void> {
    const local = this.filas.find((fila) => fila.id === id);
    if (local !== undefined) {
      local.deleted = 1;
      local.deleted_at = ahora.toISOString();
    }
  }

  async marcarPrincipal(): Promise<void> {
    return;
  }

  private reemplazar(contacto: ContactoConfianza): void {
    const indice = this.filas.findIndex((fila) => fila.id === contacto.id);
    if (indice === -1) {
      this.filas.push(contacto);
      return;
    }
    this.filas[indice] = contacto;
  }
}

class AlertasEnMemoria implements AlertasSyncRepository {
  readonly filas: Alerta[];

  constructor(filas: Alerta[] = []) {
    this.filas = [...filas];
  }

  async listar(): Promise<Alerta[]> {
    return this.filas.filter((fila) => fila.deleted === 0);
  }

  async listarPendientes(): Promise<Alerta[]> {
    return this.filas.filter((fila) => fila.pending === 1);
  }

  async obtenerPorId(id: string): Promise<Alerta | null> {
    return this.filas.find((fila) => fila.id === id && fila.deleted === 0) ?? null;
  }

  async guardar(alerta: Alerta): Promise<void> {
    this.reemplazar(alerta);
  }

  async guardarDesdeApi(alerta: Alerta): Promise<void> {
    const local = this.filas.find((fila) => fila.id === alerta.id);
    if (local === undefined || alerta.updated_at > local.updated_at) {
      this.reemplazar(alerta);
    }
  }

  async confirmarSubida(alerta: Alerta, updatedAtLocal: string): Promise<void> {
    const local = this.filas.find((fila) => fila.id === alerta.id);
    if (local !== undefined && local.updated_at === updatedAtLocal && local.pending === 1) {
      this.reemplazar(alerta);
    }
  }

  async marcarSincronizado(id: string, updatedAtLocal: string): Promise<void> {
    const local = this.filas.find((fila) => fila.id === id && fila.updated_at === updatedAtLocal);
    if (local !== undefined) {
      local.remote_id = id;
      local.pending = 0;
    }
  }

  async marcarBorrado(id: string, ahora: Date): Promise<void> {
    const local = this.filas.find((fila) => fila.id === id);
    if (local !== undefined) {
      local.deleted = 1;
      local.deleted_at = ahora.toISOString();
    }
  }

  private reemplazar(alerta: Alerta): void {
    const indice = this.filas.findIndex((fila) => fila.id === alerta.id);
    if (indice === -1) {
      this.filas.push(alerta);
      return;
    }
    this.filas[indice] = alerta;
  }
}

function clienteFalso(cambios: Partial<ClienteSincronizacion> = {}): ClienteSincronizacion {
  return {
    obtenerContactos: async () => ({ items: [], servidor_ahora: AHORA }),
    guardarContacto: async (contacto) => contacto,
    borrarContacto: async () => undefined,
    obtenerAlertas: async () => ({ items: [], servidor_ahora: AHORA }),
    guardarAlerta: async (alerta) => alerta,
    borrarAlerta: async () => undefined,
    ...cambios,
  };
}

function dependencias(
  cambios: Partial<DependenciasSincronizacion> = {},
): DependenciasSincronizacion {
  return {
    ajustes: new AjustesEnMemoria(),
    contactos: new ContactosEnMemoria(),
    alertas: new AlertasEnMemoria(),
    cliente: clienteFalso(),
    ...cambios,
  };
}

function contactoApi(contacto: ContactoConfianza): ContactoApi {
  return {
    id: contacto.id,
    nombre: contacto.nombre,
    telefono: contacto.telefono,
    parentesco: contacto.parentesco,
    principal: contacto.principal === 1 ? 1 : 0,
    created_at: contacto.created_at,
    updated_at: contacto.updated_at,
    deleted_at: contacto.deleted_at,
  };
}

function alertaApi(alerta: Alerta): AlertaApi {
  return {
    id: alerta.id,
    lat: alerta.lat,
    lng: alerta.lng,
    precision_m: alerta.precision_m,
    bateria_pct: alerta.bateria_pct,
    estado: alerta.estado,
    creada_en: alerta.creada_en,
    created_at: alerta.created_at,
    updated_at: alerta.updated_at,
    deleted_at: alerta.deleted_at,
  };
}

describe("sincronizarDatos · M14", () => {
  it("vincula la primera cuenta, sube cambios y guarda los cursores", async () => {
    const settings = new AjustesEnMemoria();
    const contacts = new ContactosEnMemoria([CONTACTO]);
    const alerts = new AlertasEnMemoria([ALERTA]);
    const client = clienteFalso({
      guardarContacto: async (contacto) => ({
        ...contacto,
        updated_at: "2026-11-20T22:01:00.000Z",
      }),
      guardarAlerta: async (alerta) => ({
        ...alerta,
        updated_at: "2026-11-20T22:01:00.000Z",
      }),
    });

    await sincronizarDatos("usuario-1", {
      ajustes: settings,
      contactos: contacts,
      alertas: alerts,
      cliente: client,
    });

    expect(await settings.obtenerClave("sync.usuario_id")).toBe("usuario-1");
    expect(contacts.filas[0].pending).toBe(0);
    expect(contacts.filas[0].remote_id).toBe(CONTACTO.id);
    expect(alerts.filas[0].pending).toBe(0);
    expect(await settings.obtenerClave("sync.contactos.since")).toBe(AHORA);
    expect(await settings.obtenerClave("sync.alertas.since")).toBe(AHORA);
  });

  it("bloquea otra cuenta antes de llamar a la API", async () => {
    const settings = new AjustesEnMemoria();
    settings.valores.set("sync.usuario_id", "usuario-1");
    const obtenerContactos = jest.fn(async () => ({ items: [], servidor_ahora: AHORA }));
    const deps = dependencias({
      ajustes: settings,
      cliente: clienteFalso({ obtenerContactos }),
    });

    await expect(sincronizarDatos("usuario-2", deps)).rejects.toBeInstanceOf(
      CuentaSincronizacionDiferenteError,
    );
    expect(obtenerContactos).not.toHaveBeenCalled();
  });

  it("aplica tombstones remotos sin volverlos pendientes", async () => {
    const contacts = new ContactosEnMemoria();
    const remoto = {
      ...contactoApi(CONTACTO),
      deleted_at: "2026-11-20T22:02:00.000Z",
      updated_at: "2026-11-20T22:02:00.000Z",
    };
    const deps = dependencias({
      contactos: contacts,
      cliente: clienteFalso({
        obtenerContactos: async (): Promise<PaginaContactos> => ({
          items: [remoto],
          servidor_ahora: "2026-11-20T22:03:00.000Z",
        }),
      }),
    });

    await sincronizarDatos("usuario-1", deps);

    expect(contacts.filas[0].deleted).toBe(1);
    expect(contacts.filas[0].pending).toBe(0);
    expect(contacts.filas[0].deleted_at).toBe(remoto.deleted_at);
  });

  it("avanza por páginas de 500 aunque varios registros compartan updated_at", async () => {
    const items: ContactoApi[] = Array.from({ length: 500 }, (_, indice) => {
      return {
        ...contactoApi({
          ...CONTACTO,
          id: `contacto-${String(indice).padStart(3, "0")}`,
        }),
      };
    });
    const cursores: { since: string; afterId: string | undefined }[] = [];
    const deps = dependencias({
      cliente: clienteFalso({
        obtenerContactos: async (since, afterId): Promise<PaginaContactos> => {
          cursores.push({ since, afterId });
          if (cursores.length === 1) {
            return { items, servidor_ahora: AHORA };
          }
          return {
            items: [{ ...items[499], id: "zz-final" }],
            servidor_ahora: "2026-11-20T23:00:00.000Z",
          };
        },
      }),
    });

    await sincronizarDatos("usuario-1", deps);

    expect(cursores).toEqual([
      { since: "1970-01-01T00:00:00.000Z", afterId: undefined },
      { since: AHORA, afterId: items[499].id },
    ]);
    expect(await deps.ajustes.obtenerClave("sync.contactos.since")).toBe(
      "2026-11-20T23:00:00.000Z",
    );
  });

  it("usa after_id al paginar alertas con el mismo updated_at", async () => {
    const items: AlertaApi[] = Array.from({ length: 500 }, (_, indice) =>
      alertaApi({
        ...ALERTA,
        id: `alerta-${String(indice).padStart(3, "0")}`,
      }),
    );
    const cursores: { since: string; afterId: string | undefined }[] = [];
    const deps = dependencias({
      cliente: clienteFalso({
        obtenerAlertas: async (since, afterId): Promise<PaginaAlertas> => {
          cursores.push({ since, afterId });
          if (cursores.length === 1) {
            return { items, servidor_ahora: AHORA };
          }
          return {
            items: [{ ...items[499], id: "zz-alerta" }],
            servidor_ahora: "2026-11-20T23:00:00.000Z",
          };
        },
      }),
    });

    await sincronizarDatos("usuario-1", deps);

    expect(cursores).toEqual([
      { since: "1970-01-01T00:00:00.000Z", afterId: undefined },
      { since: AHORA, afterId: items[499].id },
    ]);
  });

  it("no guarda el cursor si el servidor repite una página sin avanzar", async () => {
    const contacto = contactoApi(CONTACTO);
    const items = Array.from({ length: 500 }, () => contacto);
    const deps = dependencias({
      cliente: clienteFalso({
        obtenerContactos: async (): Promise<PaginaContactos> => ({
          items,
          servidor_ahora: AHORA,
        }),
      }),
    });

    await expect(sincronizarDatos("usuario-1", deps)).rejects.toThrow(
      "La paginación de contactos no avanzó.",
    );
    expect(await deps.ajustes.obtenerClave("sync.contactos.since")).toBeNull();
  });

  it("trata DELETE 404 como ya sincronizado", async () => {
    const borrado = { ...CONTACTO, deleted: 1, deleted_at: AHORA };
    const contacts = new ContactosEnMemoria([borrado]);
    const deps = dependencias({
      contactos: contacts,
      cliente: clienteFalso({
        borrarContacto: async () => {
          throw new ApiError("desconocido", 404);
        },
      }),
    });

    await sincronizarDatos("usuario-1", deps);

    expect(contacts.filas[0].pending).toBe(0);
    expect(contacts.filas[0].remote_id).toBe(CONTACTO.id);
  });
});
