# A0 · Base de la API — ESPECIFICACIÓN

- **Estado:** **Borrador** (solo la persona lo cambia a _Aprobada_)
- **Feature:** A0 — Base: errores y HTTP, entorno validado, Firebase Admin, verificación de token, `health` y `check:env`
- **Fecha:** 2026-11-14
- **Aprobada por:** _pendiente_

> Documento para revisar y aprobar. Se mueve a `C:\Users\LUIS\boton-de-seguridad-api\docs\specs\a0-base.md`
> cuando la persona lo apruebe; hasta entonces no se implementa nada (AGENTS.md, regla 1).

## 1. Contexto y objetivo

Todas las rutas de negocio (A1–A6) necesitan lo mismo: un formato de error único, un entorno validado,
un cliente de Firebase que no explote al importar, y una forma segura de saber quién llama. A0 construye
esa base **sin rutas de negocio**. Añade `GET /api/health` y el comando `npm run check:env`.

## 2. Alcance

**Incluye:**

- Clases de error de dominio y su traducción a HTTP.
- Lectura y validación de variables de entorno con Zod; único lugar con `process.env`.
- Inicialización perezosa de Firebase Admin (Auth y Firestore).
- Verificación del ID token y extracción del contexto (`uid`, `email`).
- `GET /api/health` (público).
- `npm run check:env`: muestra qué variables faltan, **nunca sus valores**.
- Pruebas: 401 sin token, 400 de validación, 500 sin detalles, entorno y errores.

**No incluye:** registro/login (A1), contactos (A2), alertas (A3), borrado de cuenta (A4), roles (A5),
límite de intentos (A6), CORS explícito ni cabeceras de seguridad avanzadas (se deciden en A1).

## 3. Errores de dominio

Archivo: `app/shared/server/errors.ts`. Cada clase lleva su código HTTP.

| Clase                       | Código | Mensaje por defecto (cliente)        | Cuándo                                              |
| --------------------------- | ------ | ------------------------------------ | --------------------------------------------------- |
| `ValidationError`           | 400    | `Los datos enviados no son válidos`  | Zod falla en la frontera                            |
| `UnauthorizedError`         | 401    | `Se requiere una sesión válida`      | Falta el header, token inválido, vencido o revocado |
| `ForbiddenError`            | 403    | `No tienes permiso para esta acción` | Falta el claim `rol` (A5)                           |
| `NotFoundError`             | 404    | `No encontrado`                      | El recurso no existe o no es de la persona          |
| `ConflictError`             | 409    | `El recurso ya existe`               | Unicidad (correo repetido en A1, duplicados en A2)  |
| `PayloadTooLargeError`      | 413    | `La petición es demasiado grande`    | Cuerpo > 32 KiB (ver P3)                            |
| `UnsupportedMediaTypeError` | 415    | `Formato no soportado`               | `Content-Type` no es `application/json`             |
| `TooManyRequestsError`      | 429    | `Demasiados intentos`                | Límite de intentos (A6)                             |
| `InternalError`             | 500    | `Error interno`                      | Cualquier otra cosa                                 |

Reglas:

- R1. El cuerpo de error es siempre `{ "error": string, "detalles"?: [{ "campo": string, "mensaje": string }] }`.
- R2. Solo `ValidationError` lleva `detalles`, con máximo **10** entradas.
- R3. Los 5xx **nunca** exponen mensaje interno, stack ni detalles: `{ "error": "Error interno" }`.
- R4. Lo que no sea una clase de dominio se registra en el servidor con `console.error` **sin** cuerpo de la petición, sin cabeceras y sin datos personales.

## 4. Entorno

Archivo: `app/shared/server/env.ts`.

| Variable                | Obligatoria | Regla                                                                                                       |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`   | Sí          | texto no vacío                                                                                              |
| `FIREBASE_CLIENT_EMAIL` | Sí          | texto no vacío, contiene `@`                                                                                |
| `FIREBASE_PRIVATE_KEY`  | Sí          | `\n` literales convertidos a saltos de línea; mínimo 200 caracteres; contiene `-----BEGIN PRIVATE KEY-----` |
| `FIREBASE_WEB_API_KEY`  | Sí          | texto no vacío (lo usa A1)                                                                                  |

- R5. `getEnv()` valida y cachea; si falta algo lanza `EnvironmentError` (500) con la **lista de nombres** que faltan, nunca valores ni fragmentos.
- R6. `npm run check:env` imprime una tabla `variable | estado (definida/falta/vacía)` y sale con código 1 si falta alguna. Nunca imprime valores (tampoco los primeros caracteres).
- R7. En las pruebas, el entorno se inyecta como parámetro (`getEnv(source)`); no se lee `process.env` real.

## 5. Firebase Admin

- R8. `app/shared/server/firebase.ts` crea los clientes **de forma perezosa** (en la primera llamada) y los reutiliza. Al importar el módulo no se inicializa nada.
- R9. Se inicializa una sola aplicación (`initializeApp({ credential: cert(...) }, "app")`); si ya existe (recarga en desarrollo), se reutiliza.
- R10. Exporta `getAuthClient()` y `getFirestoreClient()`. Nadie más en el código construye clientes (lo vigila el lint en `app/api/**`).

## 6. Sesión y token

Archivo: `app/shared/server/session.ts`.

- R11. El header debe ser exactamente `Authorization: Bearer <token>` (esquema sin distinguir mayúsculas). Si falta o está mal formado → `UnauthorizedError`.
- R12. Se verifica con `getAuth().verifyIdToken(token)`; token inválido, vencido o revocado → `UnauthorizedError` con **el mismo mensaje** en los tres casos.
- R13. Devuelve `{ uid, email, rol }` tomado **solo** del token verificado. `email` es `string | null`; `rol` es `"usuario" | "admin"` (por defecto `usuario`).
- R14. El `uid` nunca se lee del cuerpo, query ni URL.
- R15. La verificación se inyecta como dependencia (`createSessionVerifier({ verifyIdToken })`) para probarla sin red.

## 7. Rutas

### `GET /api/health`

- R16. Público, sin token. `runtime = "nodejs"`.
- R17. Responde `200 { ok: true, servicio: "boton-de-seguridad-api", version: string }`.
- R18. No lee variables de entorno obligatorias ni toca Firebase: debe responder aunque el `.env` esté incompleto.

### Manejador común de errores

- R19. Todo `route.ts` envuelve su lógica con `withErrorHandling`. Traducible: cualquier clase de la tabla §3 → su código y cuerpo. Lo demás → 500 genérico.
- R20. Todo body se valida con `Esquema.parse(await req.json())` y el resultado se mapea a `ValidationError` con `detalles` (campo y mensaje en español, máximo 10).

## 8. Criterios de aceptación

1. Dado `GET /api/health`, entonces `200` con `ok: true` y `version`, sin variables de entorno.
2. Dada una ruta protegida sin header, entonces `401` con `{ "error": "Se requiere una sesión válida" }`.
3. Dado `Authorization: Bearer abc` con token inválido, entonces `401` con el **mismo** mensaje que el caso 2.
4. Dado un body que no cumple el esquema, entonces `400` con `detalles` de máximo 10 entradas y sin datos internos.
5. Dado un fallo inesperado del servicio, entonces `500 { "error": "Error interno" }` y nada del stack en la respuesta.
6. Dado un `.env` sin `FIREBASE_WEB_API_KEY`, `check:env` sale con 1, marca esa variable como `falta` y no imprime ningún valor de las definidas.
7. Dado `FIREBASE_PRIVATE_KEY` con `\n` literales, el entorno la entrega con saltos de línea reales.

## 9. Pruebas previstas

- `app/shared/tests/errors.test.ts`: cada clase → su código y cuerpo; 5xx nunca lleva detalles.
- `app/shared/tests/http.test.ts`: `withErrorHandling` traduce dominio, Zod y fallo genérico; conserva la respuesta feliz.
- `app/shared/tests/env.test.ts`: válido, faltantes (lista de nombres), clave con `\n`, sin filtrar valores.
- `app/shared/tests/session.test.ts`: header ausente/mal formado, token inválido/vencido, `rol` por defecto, `email` nulo, `uid` solo del token.
- `app/api/health/route.test.ts`: 200 sin entorno.

## 10. Preguntas abiertas (necesito tu respuesta)

| #   | Pregunta                                                                                         | Propuesta                                                    | Respuesta |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | --------- |
| P1  | ¿El mensaje de 401 debe ser idéntico para "falta token", "token vencido" y "token inválido"?     | Sí, idéntico (no revela nada).                               |           |
| P2  | ¿`check:env` debe pedir también `FIREBASE_WEB_API_KEY` en A0, aunque aún no la use ninguna ruta? | Sí: la persona ya debe tenerla antes de A1.                  |           |
| P3  | ¿Límite del cuerpo JSON?                                                                         | 32 KiB en A0, revisable en A2 si los contactos lo necesitan. |           |
| P4  | ¿Los errores en español o en inglés? (la app muestra `error` tal cual)                           | Español, como el resto del proyecto.                         |           |

## 11. Dependencias y notas de implementación

- Añadir a `package.json`: `next`, `react`, `react-dom`, `firebase-admin` y los scripts `dev`, `build`, `start`, `check:full`, `check:env` (se retiran de "pendiente A0" en `README.md` y `AGENTS.md`).
- `check:env` se ejecuta con `tsx --conditions=react-server` (como en el ADR del proyecto) porque importa módulos de servidor.
- Sin dependencias nuevas fuera de las ya justificadas en `docs/adr/0002`.
