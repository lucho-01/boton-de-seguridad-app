# Contrato entre la app y la API

Fuente de verdad compartida con el repo **`boton-de-seguridad-api`**. Lo que cambie aquí se cambia en los dos repositorios y se decide con la persona. La API no envía SMS ni llamadas: solo registra.

## 0. Configuración de la conexión

| Elemento               | Valor                                                                     |
| ---------------------- | ------------------------------------------------------------------------- |
| URL base               | `EXPO_PUBLIC_API_URL` (HTTPS, sin barra final, sin `localhost` en el APK) |
| Credenciales en la app | **Ninguna** (ni `firebaseConfig`, ni `FIREBASE_*`, ni claves de servicio) |
| Sesión                 | ID token + refresh token, guardados en `expo-secure-store`                |
| Cabecera               | `Authorization: Bearer <token>`                                           |
| Salud                  | `GET /api/health` → `200 { ok: true, servicio, version }`                 |

## 1. Autenticación (`/api/auth`)

| Método y ruta             | Cuerpo                               | Respuesta feliz                                                    |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `POST /api/auth/registro` | `{ email, password }` (password ≥ 8) | `201 { token, refreshToken, expiraEnSeg, usuario: { id, email } }` |
| `POST /api/auth/login`    | `{ email, password }`                | `200` igual                                                        |
| `POST /api/auth/refresh`  | `{ refreshToken }`                   | `200 { token, refreshToken, expiraEnSeg }`                         |
| `GET /api/auth/yo`        | Bearer                               | `200 { usuario: { id, email } }`                                   |

Errores: correo repetido → `409`; credenciales inválidas → `401` con el **mismo mensaje** exista o no el correo; contraseña débil → `400`; demasiados intentos → `429`.

**Renovación:** ante `401`, la app llama **una sola vez** a `/api/auth/refresh` y reintenta la petición original. Si el refresh falla, borra la sesión y vuelve al login.

## 2. Sincronización (por recurso privado)

| Método y ruta                    | Comportamiento                                                                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/<recurso>?since=<ISO>` | `200 { items: [{ id, ...campos, created_at, updated_at, deleted_at }], servidor_ahora }`. Máx. 500: repetir con el último `updated_at` hasta recibir menos de 500. Incluye borrados lógicos. |
| `PUT /api/<recurso>/<id>`        | Crea o reemplaza (idempotente). Valida con Zod y descarta campos no declarados. `200` con el documento.                                                                                      |
| `DELETE /api/<recurso>/<id>`     | Borrado lógico (`deleted_at`). `200 { ok: true }`; `404` si no existe.                                                                                                                       |

Recursos: `contactos` (contacto de confianza) y `alertas`.

**Estrategia:** la app escribe primero en SQLite (`pending = 1`), un servicio envía los pendientes y luego pide `?since=` para traer cambios. Conflictos: **gana la última escritura** (`updated_at` del servidor).

## 3. Recursos y campos

```text
contactos:
  id (UUID, lo genera la app) · nombre: string · telefono: string (10 dígitos)
  parentesco: string|null · created_at · updated_at · deleted_at

alertas:
  id (UUID) · lat: number|null · lng: number|null · precision_m: number|null
  bateria_pct: integer|null · estado: "cancelada"|"mensaje_preparado" · creada_en: ISO 8601 UTC
  created_at · updated_at · deleted_at
```

Campos en `snake_case`, con los mismos nombres que las columnas de SQLite. Fechas ISO 8601 UTC; sin `undefined` (usar `null`).

## 4. Rutas propias del proyecto

| Método y ruta              | Respuesta                           |
| -------------------------- | ----------------------------------- |
| `GET /api/alertas/resumen` | conteo de alertas por mes           |
| `DELETE /api/mi-cuenta`    | borra todos los datos de la persona |

## 5. Errores

Formato único:

```json
{ "error": "mensaje", "detalles": [{ "campo": "telefono", "mensaje": "Debe tener 10 dígitos" }] }
```

Códigos: 400, 401, 403, 404, 409, 413, 415, 429. Los 500 responden `{ "error": "Error interno" }` sin detalles.

La app muestra `error`; usa `detalles` solo para marcar campos del formulario y nunca muestra cuerpos crudos.
