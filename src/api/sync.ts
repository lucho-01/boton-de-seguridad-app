/** Endpoints autenticados de sincronización (M14). */

import type { z } from "zod";

import {
  AlertasListaSchema,
  AlertaSchema,
  ContactosListaSchema,
  ContactoConfianzaSchema,
  OkSchema,
} from "./contracts";
import { peticion, type OpcionesPeticion } from "./http";

export type ContactoApi = z.infer<typeof ContactoConfianzaSchema>;
export type AlertaApi = z.infer<typeof AlertaSchema>;
export type PaginaContactos = z.infer<typeof ContactosListaSchema>;
export type PaginaAlertas = z.infer<typeof AlertasListaSchema>;

/** Lee una página de contactos desde el cursor ISO del servidor. */
export async function obtenerContactos(
  since: string,
  fetchImpl?: OpcionesPeticion["fetchImpl"],
  afterId?: string,
): Promise<PaginaContactos> {
  const opciones: OpcionesPeticion = { fetchImpl };
  let ruta = `/api/contactos?since=${encodeURIComponent(since)}`;
  if (afterId !== undefined) {
    ruta += `&after_id=${encodeURIComponent(afterId)}`;
  }
  return peticion("GET", ruta, opciones, ContactosListaSchema, true);
}

/** Crea o reemplaza un contacto en la API, de forma idempotente. */
export async function guardarContactoApi(
  contacto: ContactoApi,
  fetchImpl?: OpcionesPeticion["fetchImpl"],
): Promise<ContactoApi> {
  const opciones: OpcionesPeticion = { cuerpo: contacto, fetchImpl };
  return peticion(
    "PUT",
    `/api/contactos/${encodeURIComponent(contacto.id)}`,
    opciones,
    ContactoConfianzaSchema,
    true,
  );
}

/** Solicita el borrado lógico de un contacto en la API. */
export async function borrarContactoApi(
  id: string,
  fetchImpl?: OpcionesPeticion["fetchImpl"],
): Promise<void> {
  const opciones: OpcionesPeticion = { fetchImpl };
  await peticion("DELETE", `/api/contactos/${encodeURIComponent(id)}`, opciones, OkSchema, true);
}

/** Lee una página de alertas desde el cursor ISO del servidor. */
export async function obtenerAlertas(
  since: string,
  fetchImpl?: OpcionesPeticion["fetchImpl"],
  afterId?: string,
): Promise<PaginaAlertas> {
  const opciones: OpcionesPeticion = { fetchImpl };
  let ruta = `/api/alertas?since=${encodeURIComponent(since)}`;
  if (afterId !== undefined) {
    ruta += `&after_id=${encodeURIComponent(afterId)}`;
  }
  return peticion("GET", ruta, opciones, AlertasListaSchema, true);
}

/** Crea o reemplaza una alerta en la API, de forma idempotente. */
export async function guardarAlertaApi(
  alerta: AlertaApi,
  fetchImpl?: OpcionesPeticion["fetchImpl"],
): Promise<AlertaApi> {
  const opciones: OpcionesPeticion = { cuerpo: alerta, fetchImpl };
  return peticion(
    "PUT",
    `/api/alertas/${encodeURIComponent(alerta.id)}`,
    opciones,
    AlertaSchema,
    true,
  );
}

/** Solicita el borrado lógico de una alerta en la API. */
export async function borrarAlertaApi(
  id: string,
  fetchImpl?: OpcionesPeticion["fetchImpl"],
): Promise<void> {
  const opciones: OpcionesPeticion = { fetchImpl };
  await peticion("DELETE", `/api/alertas/${encodeURIComponent(id)}`, opciones, OkSchema, true);
}
