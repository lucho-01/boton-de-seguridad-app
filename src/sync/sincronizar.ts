/** Orquestación offline-first de contactos y alertas (M14). */

import { ApiError } from "@/api";
import {
  borrarAlertaApi,
  borrarContactoApi,
  guardarAlertaApi,
  guardarContactoApi,
  obtenerAlertas,
  obtenerContactos,
  type AlertaApi,
  type ContactoApi,
  type PaginaAlertas,
  type PaginaContactos,
} from "@/api";
import { AlertasRepositorySqlite, type AlertasSyncRepository } from "@/repositories/alertas";
import { AjustesRepositorySqlite, type AjustesRepository } from "@/repositories/ajustes";
import { ContactosRepositorySqlite, type ContactosSyncRepository } from "@/repositories/contactos";

import {
  alertaApiDesdeLocal,
  alertaLocalDesdeApi,
  contactoApiDesdeLocal,
  contactoLocalDesdeApi,
} from "./mapeo";

const CLAVE_USUARIO = "sync.usuario_id";
const CLAVE_CURSOR_CONTACTOS = "sync.contactos.since";
const CLAVE_CURSOR_ALERTAS = "sync.alertas.since";
const CURSOR_INICIAL = "1970-01-01T00:00:00.000Z";
const TAMANO_PAGINA = 500;

export interface ClienteSincronizacion {
  obtenerContactos(since: string, afterId?: string): Promise<PaginaContactos>;
  guardarContacto(contacto: ContactoApi): Promise<ContactoApi>;
  borrarContacto(id: string): Promise<void>;
  obtenerAlertas(since: string, afterId?: string): Promise<PaginaAlertas>;
  guardarAlerta(alerta: AlertaApi): Promise<AlertaApi>;
  borrarAlerta(id: string): Promise<void>;
}

export interface DependenciasSincronizacion {
  ajustes: AjustesRepository;
  contactos: ContactosSyncRepository;
  alertas: AlertasSyncRepository;
  cliente: ClienteSincronizacion;
}

export class CuentaSincronizacionDiferenteError extends Error {
  constructor() {
    super("Este dispositivo ya está vinculado a otra cuenta. No se sincronizaron los datos.");
    this.name = "CuentaSincronizacionDiferenteError";
  }
}

const CLIENTE_API: ClienteSincronizacion = {
  obtenerContactos: (since, afterId) => obtenerContactos(since, undefined, afterId),
  guardarContacto: guardarContactoApi,
  borrarContacto: borrarContactoApi,
  obtenerAlertas: (since, afterId) => obtenerAlertas(since, undefined, afterId),
  guardarAlerta: guardarAlertaApi,
  borrarAlerta: borrarAlertaApi,
};

function dependenciasPredeterminadas(): DependenciasSincronizacion {
  return {
    ajustes: new AjustesRepositorySqlite(),
    contactos: new ContactosRepositorySqlite(),
    alertas: new AlertasRepositorySqlite(),
    cliente: CLIENTE_API,
  };
}

async function validarCuentaVinculada(
  usuarioId: string,
  ajustes: AjustesRepository,
): Promise<void> {
  const usuarioVinculado = await ajustes.obtenerClave(CLAVE_USUARIO);
  if (usuarioVinculado === null) {
    await ajustes.guardarClave(CLAVE_USUARIO, usuarioId);
    return;
  }
  if (usuarioVinculado !== usuarioId) {
    throw new CuentaSincronizacionDiferenteError();
  }
}

async function cursorDesde(ajustes: AjustesRepository, clave: string): Promise<string> {
  const cursor = await ajustes.obtenerClave(clave);
  if (cursor === null) {
    return CURSOR_INICIAL;
  }
  return cursor;
}

async function subirContactos(deps: DependenciasSincronizacion): Promise<void> {
  const pendientes = await deps.contactos.listarPendientes();
  for (const contacto of pendientes) {
    if (contacto.deleted === 1) {
      await borrarContactoPendiente(contacto.id, contacto.updated_at, deps);
    } else {
      const remoto = await deps.cliente.guardarContacto(contactoApiDesdeLocal(contacto));
      await deps.contactos.confirmarSubida(contactoLocalDesdeApi(remoto), contacto.updated_at);
    }
  }
}

async function borrarContactoPendiente(
  id: string,
  updatedAtLocal: string,
  deps: DependenciasSincronizacion,
): Promise<void> {
  try {
    await deps.cliente.borrarContacto(id);
  } catch (fallo) {
    if (!(fallo instanceof ApiError) || fallo.estado !== 404) {
      throw fallo;
    }
  }
  await deps.contactos.marcarSincronizado(id, updatedAtLocal);
}

async function subirAlertas(deps: DependenciasSincronizacion): Promise<void> {
  const pendientes = await deps.alertas.listarPendientes();
  for (const alerta of pendientes) {
    if (alerta.deleted === 1) {
      await borrarAlertaPendiente(alerta.id, alerta.updated_at, deps);
    } else {
      const remoto = await deps.cliente.guardarAlerta(alertaApiDesdeLocal(alerta));
      await deps.alertas.confirmarSubida(alertaLocalDesdeApi(remoto), alerta.updated_at);
    }
  }
}

async function borrarAlertaPendiente(
  id: string,
  updatedAtLocal: string,
  deps: DependenciasSincronizacion,
): Promise<void> {
  try {
    await deps.cliente.borrarAlerta(id);
  } catch (fallo) {
    if (!(fallo instanceof ApiError) || fallo.estado !== 404) {
      throw fallo;
    }
  }
  await deps.alertas.marcarSincronizado(id, updatedAtLocal);
}

async function descargarContactos(
  deps: DependenciasSincronizacion,
  cursorInicial: string,
): Promise<string> {
  let cursor = cursorInicial;
  let afterId: string | undefined;
  while (true) {
    const pagina = await deps.cliente.obtenerContactos(cursor, afterId);
    for (const contacto of pagina.items) {
      await deps.contactos.guardarDesdeApi(contactoLocalDesdeApi(contacto));
    }
    if (pagina.items.length < TAMANO_PAGINA) {
      return pagina.servidor_ahora;
    }
    const ultimo = ultimoContacto(pagina);
    if (!avanzaCursor(cursor, afterId, ultimo.updated_at, ultimo.id)) {
      throw new Error("La paginación de contactos no avanzó.");
    }
    cursor = ultimo.updated_at;
    afterId = ultimo.id;
  }
}

function ultimoContacto(pagina: PaginaContactos): ContactoApi {
  const ultimo = pagina.items[pagina.items.length - 1];
  if (ultimo === undefined) {
    throw new Error("La API devolvió una página completa de contactos vacía.");
  }
  return ultimo;
}

async function descargarAlertas(
  deps: DependenciasSincronizacion,
  cursorInicial: string,
): Promise<string> {
  let cursor = cursorInicial;
  let afterId: string | undefined;
  while (true) {
    const pagina = await deps.cliente.obtenerAlertas(cursor, afterId);
    for (const alerta of pagina.items) {
      await deps.alertas.guardarDesdeApi(alertaLocalDesdeApi(alerta));
    }
    if (pagina.items.length < TAMANO_PAGINA) {
      return pagina.servidor_ahora;
    }
    const ultimo = ultimoAlerta(pagina);
    if (!avanzaCursor(cursor, afterId, ultimo.updated_at, ultimo.id)) {
      throw new Error("La paginación de alertas no avanzó.");
    }
    cursor = ultimo.updated_at;
    afterId = ultimo.id;
  }
}

function ultimoAlerta(pagina: PaginaAlertas): AlertaApi {
  const ultimo = pagina.items[pagina.items.length - 1];
  if (ultimo === undefined) {
    throw new Error("La API devolvió una página completa de alertas vacía.");
  }
  return ultimo;
}

function avanzaCursor(
  cursor: string,
  afterId: string | undefined,
  updatedAt: string,
  id: string,
): boolean {
  if (updatedAt > cursor) {
    return true;
  }
  if (updatedAt === cursor && afterId !== undefined && id > afterId) {
    return true;
  }
  return updatedAt === cursor && afterId === undefined;
}

async function sincronizarContactos(deps: DependenciasSincronizacion): Promise<void> {
  await subirContactos(deps);
  const cursor = await cursorDesde(deps.ajustes, CLAVE_CURSOR_CONTACTOS);
  const siguienteCursor = await descargarContactos(deps, cursor);
  await deps.ajustes.guardarClave(CLAVE_CURSOR_CONTACTOS, siguienteCursor);
}

async function sincronizarAlertas(deps: DependenciasSincronizacion): Promise<void> {
  await subirAlertas(deps);
  const cursor = await cursorDesde(deps.ajustes, CLAVE_CURSOR_ALERTAS);
  const siguienteCursor = await descargarAlertas(deps, cursor);
  await deps.ajustes.guardarClave(CLAVE_CURSOR_ALERTAS, siguienteCursor);
}

/** Sincroniza recursos solo después de comprobar la cuenta vinculada al dispositivo. */
export async function sincronizarDatos(
  usuarioId: string,
  dependencias: DependenciasSincronizacion = dependenciasPredeterminadas(),
): Promise<void> {
  await validarCuentaVinculada(usuarioId, dependencias.ajustes);
  await sincronizarContactos(dependencias);
  await sincronizarAlertas(dependencias);
}
