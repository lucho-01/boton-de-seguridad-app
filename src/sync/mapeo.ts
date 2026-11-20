import type { AlertaApi, ContactoApi } from "@/api";
import type { Alerta, ContactoConfianza } from "@/models";

export function contactoLocalDesdeApi(contacto: ContactoApi): ContactoConfianza {
  let deleted = 0;
  if (contacto.deleted_at !== null) {
    deleted = 1;
  }
  return {
    ...contacto,
    remote_id: contacto.id,
    pending: 0,
    deleted,
  };
}

export function contactoApiDesdeLocal(contacto: ContactoConfianza): ContactoApi {
  let principal: 0 | 1;
  if (contacto.principal === 1) {
    principal = 1;
  } else if (contacto.principal === 0) {
    principal = 0;
  } else {
    throw new Error("El contacto tiene un valor de principal no válido.");
  }
  return {
    id: contacto.id,
    nombre: contacto.nombre,
    telefono: contacto.telefono,
    parentesco: contacto.parentesco,
    principal,
    created_at: contacto.created_at,
    updated_at: contacto.updated_at,
    deleted_at: contacto.deleted_at,
  };
}

export function alertaLocalDesdeApi(alerta: AlertaApi): Alerta {
  let deleted = 0;
  if (alerta.deleted_at !== null) {
    deleted = 1;
  }
  return {
    ...alerta,
    remote_id: alerta.id,
    pending: 0,
    deleted,
  };
}

export function alertaApiDesdeLocal(alerta: Alerta): AlertaApi {
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
