import { z } from "zod";

/**
 * Esquemas Zod del contrato con la API (`docs/api-contrato.md`).
 * Los campos viajan en `snake_case`; la respuesta de auth usa `camelCase`
 * tal como lo define el contrato y se mapea en `src/api/`.
 */

export const UsuarioSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
});

/** `POST /api/auth/registro`, `POST /api/auth/login` y `/api/auth/refresh`. */
export const RespuestaAuthSchema = z.object({
  token: z.string().min(1),
  refreshToken: z.string().min(1),
  expiraEnSeg: z.number().int().positive(),
  usuario: UsuarioSchema.optional(),
});

export const RespuestaYoSchema = z.object({
  usuario: UsuarioSchema,
});

/** `GET /api/health`. */
export const RespuestaHealthSchema = z.object({
  ok: z.literal(true),
  servicio: z.string(),
  version: z.string(),
});

export const ContactoConfianzaSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  telefono: z.string().regex(/^\d{10}$/),
  parentesco: z.string().nullable(),
  principal: z.union([z.literal(0), z.literal(1)]),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  deleted_at: z.iso.datetime().nullable(),
});

export const EstadoAlertaSchema = z.enum(["cancelada", "mensaje_preparado"]);

export const AlertaSchema = z.object({
  id: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  precision_m: z.number().nullable(),
  bateria_pct: z.number().int().nullable(),
  estado: EstadoAlertaSchema,
  creada_en: z.iso.datetime(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  deleted_at: z.iso.datetime().nullable(),
});

export const ListaSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item).max(500),
    servidor_ahora: z.iso.datetime(),
  });

export const ContactosListaSchema = ListaSchema(ContactoConfianzaSchema);
export const AlertasListaSchema = ListaSchema(AlertaSchema);

export const ResumenAlertasSchema = z.record(z.string(), z.number().int().nonnegative());

export const DetalleErrorSchema = z.object({
  campo: z.string(),
  mensaje: z.string(),
});

/** Forma única de error de la API: `{ error, detalles? }`. */
export const ErrorApiSchema = z.object({
  error: z.string(),
  detalles: z.array(DetalleErrorSchema).optional(),
});

export const OkSchema = z.object({ ok: z.literal(true) });
