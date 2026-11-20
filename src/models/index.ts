/**
 * Tipos de dominio en `snake_case`, iguales al contrato con la API
 * (`docs/api-contrato.md`) y a las columnas de SQLite.
 */

/** Usuario autenticado tal como lo devuelve `/api/auth/yo`. */
export interface Usuario {
  id: string;
  email: string;
}

/** Sesión activa: se guarda solo en `expo-secure-store`. */
export interface Sesion {
  token: string;
  refresh_token: string;
  /** Segundos de vida del `token` en el momento en que se recibió. */
  expira_en_seg: number;
  usuario: Usuario;
}

/** Datos de sincronización comunes a los recursos privados. */
export interface CamposSincronizados {
  id: string;
  remote_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** 1 si hay cambios locales sin enviar; 0 si está sincronizado. */
  pending: number;
  /** 1 si se borró localmente (borrado lógico). */
  deleted: number;
}

/** Contacto de confianza (máximo 5 por persona). */
export interface ContactoConfianza extends CamposSincronizados {
  nombre: string;
  telefono: string;
  parentesco: string | null;
  /** 1 si es el contacto principal, 0 si no. Solo uno a la vez (M5). */
  principal: number;
}

/** Estados posibles de una alerta en el historial. */
export type EstadoAlerta = "cancelada" | "mensaje_preparado";

/** Alerta registrada al cancelar o al preparar el mensaje. */
export interface Alerta extends CamposSincronizados {
  lat: number | null;
  lng: number | null;
  precision_m: number | null;
  bateria_pct: number | null;
  estado: EstadoAlerta;
  /** ISO 8601 UTC. */
  creada_en: string;
}

/** Conteo de alertas por mes de `GET /api/alertas/resumen`. */
export interface ResumenAlertas {
  [mes: string]: number;
}

/** Mensaje de error normalizado de la API (`{ error, detalles? }`). */
export interface DetalleError {
  campo: string;
  mensaje: string;
}
