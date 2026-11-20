# 36 · Botón de seguridad con contactos de confianza

> **Repositorios:** `36-boton-de-seguridad-app` y `36-boton-de-seguridad-api`

**En una frase:** Botón de alerta que, tras una cuenta regresiva cancelable, prepara un SMS con tu ubicación para tus contactos de confianza.

---

## 1. Problema y usuario

Persona que camina sola de noche o viaja y quiere avisar rápido dónde está.

Es un proyecto **atómico**: pequeño y con un solo objetivo claro. Cumpla todos los requisitos y criterios de aceptación de este documento antes de agregar funciones extra. Se construye **desde cero**: este documento es el único insumo.

## 2. Arquitectura (dos repositorios)

```text
[ App móvil ]  Expo + React Native + TypeScript + Expo Router
   │  SQLite local (funciona sin conexión)
   │  HTTPS + ID token de Firebase (guardado en expo-secure-store)
   ▼
[ API ]  Next.js (Route Handlers, runtime Node) desplegada en Vercel
   │  Variables de entorno SOLO en Vercel
   ├──────────────▶ [ Firebase ]  Authentication + Firestore (solo vía Admin SDK)
```

**Regla de oro:** la app móvil no contiene ninguna credencial. Todo lo secreto (clave privada de Firebase Admin, clave web de Firebase, token de Blob, claves de servicios de terceros) vive únicamente en las variables de entorno del proyecto en Vercel. La app solo conoce la URL pública de la API (`EXPO_PUBLIC_API_URL`) y los tokens de sesión del usuario. Recuerde: todo lo que empiece por `EXPO_PUBLIC_` queda **dentro del APK** y cualquiera puede leerlo.

## 3. Pantallas y rutas (Expo Router)

| Ruta | Contenido |
|---|---|
| `(tabs)/index` | Botón SOS grande y estado de la detección por sacudida |
| `(tabs)/contactos` | Contactos de confianza (máximo 5) |
| `(tabs)/historial` | Alertas enviadas y canceladas |
| `ajustes` | Sensibilidad de la sacudida y mensaje base |

```text
app/
├── _layout.tsx            # Stack/Tabs, GestureHandlerRootView, proveedor de sesión
├── (tabs)/index.tsx
├── (tabs)/contactos.tsx
├── (tabs)/historial.tsx
├── ajustes.tsx
src/
├── db/            # abrir SQLite, migraciones
├── repositories/  # SQL parametrizado
├── services/      # reglas de negocio + sincronización con la API
├── api/           # cliente HTTP (fetch + token + refresh + manejo de errores)
├── sensors/       # hooks: useShake, useHeading, useBarometer…
└── components/    # UI reutilizable y accesible
```

## 4. Gestos (mínimo 2 obligatorios, todos con alternativa por botón)

| Gesto | Uso en la app |
|---|---|
| Mantener presionado 3 s (long press) | Armar la alerta con anillo de progreso |
| Deslizar hacia un lado (pan) | Cancelar la cuenta regresiva |
| Deslizar contacto a la izquierda | Eliminar contacto |
| Doble toque en un contacto | Marcarlo como principal |

Implementar con `react-native-gesture-handler` (`Gesture.Pan`, `Pinch`, `Tap`, `LongPress`, `Fling`) y `react-native-reanimated`. **Accesibilidad:** cada acción hecha con un gesto debe poder hacerse también con un botón con `accessibilityLabel`, porque un lector de pantalla no ejecuta gestos complejos.

## 5. Sensores y capacidades del dispositivo (mínimo 2 obligatorias)

| Capacidad | Uso en la app | Alternativa si no está disponible |
|---|---|---|
| **Principal** · `expo-sms` | abre el redactor de SMS con el mensaje y los destinatarios ya cargados. **La persona debe pulsar «Enviar»**: la app no puede enviar mensajes en silencio. | Entrada manual o flujo alternativo sin el sensor |
| `Accelerometer` | Detectar la sacudida fuerte triple | Solo el botón |
| `expo-location` | Ubicación para el mensaje | Mensaje sin coordenadas |
| `expo-battery` | Incluir el nivel de batería en el mensaje | Omitirlo |
| `expo-haptics` | Vibración en cada segundo de la cuenta regresiva | Solo visual |

Reglas: (1) llame siempre `isAvailableAsync()` antes de usar un sensor; (2) pida permisos solo cuando el usuario active la función y explique para qué; (3) cancele las suscripciones (`subscription.remove()`) al salir de la pantalla; (4) la app **nunca** debe romperse si el sensor o el permiso no están disponibles. Notas de plataforma: `Barometer.relativeAltitude` solo existe en iOS (en Android calcule la altitud desde `pressure`); `LightSensor` es solo Android; `Pedometer.getStepCountAsync` es solo iOS y `watchStepCount` no entrega datos en segundo plano. Muchos sensores no existen en el emulador: pruebe en un dispositivo físico.

## 6. Requisitos funcionales

- **RF-01** CRUD de contactos de confianza (máximo 5, con teléfono válido).
- **RF-02** Botón SOS: mantener presionado 3 s (anillo de progreso) inicia una cuenta regresiva de 5 s **cancelable**.
- **RF-03** Detección opcional de sacudida fuerte tres veces seguidas para iniciar la cuenta regresiva.
- **RF-04** Al terminar la cuenta: obtener la ubicación, el nivel de batería, componer el SMS con un enlace de mapa y abrir el redactor.
- **RF-05** Registrar cada alerta (cancelada o con mensaje preparado) en el historial y en la API.
- **RF-06** Aviso permanente: es un proyecto educativo y **no reemplaza** la línea de emergencias de su país (en Colombia, 123).

## 7. Reglas de validación

- Teléfono de 10 dígitos; máximo 5 contactos; sin duplicados.
- Mensaje de hasta 160 caracteres (si se pasa, se acorta el texto base, no el enlace).
- Si no hay ubicación, el mensaje lo indica en lugar de inventar coordenadas.

## 8. Modelo de datos local (SQLite)

```sql
CREATE TABLE contacto_confianza (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, telefono TEXT NOT NULL, parentesco TEXT
);
CREATE TABLE alerta (
  id TEXT PRIMARY KEY, lat REAL, lng REAL, precision_m REAL, bateria_pct INTEGER,
  estado TEXT NOT NULL CHECK (estado IN ('cancelada','mensaje_preparado')), creada_en TEXT NOT NULL
);
```

Para sincronizar, agregue a cada tabla de dominio: `remote_id TEXT` (id del documento en Firestore; puede ser el mismo UUID), `updated_at TEXT`, `deleted INTEGER DEFAULT 0` y `pending INTEGER DEFAULT 0`.

## 9. API en Vercel (Next.js + Firebase)

Repositorio aparte: **Next.js (App Router) con Route Handlers** (`app/api/**/route.ts`, `export const runtime = "nodejs"`), `firebase-admin`, `zod` y `vitest`. Despliegue en Vercel.

### 9.1 Autenticación — Firebase Auth mediada por la API

La app **no incluye** `firebaseConfig` ni ninguna clave de Firebase. La API inicia sesión con correo y contraseña llamando a la API REST de Firebase Auth
(`accounts:signUp`, `accounts:signInWithPassword`, `securetoken` para renovar), usando `FIREBASE_WEB_API_KEY` que existe **solo en Vercel**.

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/auth/registro` | `{ email, password }` (contraseña ≥ 8) | `201 { token, refreshToken, expiraEnSeg, usuario:{ id, email } }` |
| `POST /api/auth/login` | `{ email, password }` | `200` igual que el registro |
| `POST /api/auth/refresh` | `{ refreshToken }` | `200 { token, refreshToken, expiraEnSeg }` |
| `GET /api/auth/yo` | — (Bearer) | `200 { usuario }` |

- `token` es el **ID token** de Firebase (dura 1 h). Todas las demás rutas exigen `Authorization: Bearer <token>` y la API lo verifica con
  `getAuth().verifyIdToken()` (Admin SDK). El `uid` sale **del token verificado**, nunca del cuerpo ni de la URL.
- La app guarda `token` y `refreshToken` en `expo-secure-store`. Si una petición devuelve 401, llama **una vez** a `/api/auth/refresh` y reintenta; si falla, vuelve al login.
- Errores: correo repetido → 409; credenciales inválidas → 401 con el **mismo mensaje** exista o no el correo; contraseña débil → 400; demasiados intentos → 429.
- Rol `admin`: *custom claim* `rol = "admin"` asignado con el Admin SDK (`setCustomUserClaims`); las rutas de administración responden 403 sin él.

### 9.2 Convenciones de Firestore (aplican a todo el proyecto)

- **Acceso solo desde la API** (Admin SDK). Las reglas de Firestore niegan todo a los clientes: `allow read, write: if false;`.
- Datos privados en `usuarios/{uid}/<recurso>/{id}`; el aislamiento entre usuarios lo da la **ruta**. Datos compartidos en colecciones raíz escritas solo por la API.
- Campos en `snake_case` con los **mismos nombres que las columnas de SQLite**. Fechas como texto ISO 8601 UTC (`2026-11-01T15:04:05.000Z`) o `YYYY-MM-DD`. Dinero en enteros (centavos). Sin `undefined`: use `null`.
- Todo documento privado lleva campos base **puestos por el servidor**: `created_at`, `updated_at` y `deleted_at` (`null` o fecha; borrado lógico).
- El `id` lo genera el cliente (UUID) y es el mismo en SQLite y Firestore: así reintentar una escritura no duplica.
- Un documento pesa máximo 1 MiB; una consulta con filtro de rango en un campo y orden/filtro en otro necesita un **índice compuesto** (`firestore.indexes.json`); en una transacción todas las lecturas van antes de las escrituras.

### 9.3 Sincronización (para cada recurso privado)

| Método y ruta | Comportamiento |
|---|---|
| `GET /api/<recurso>?since=<ISO>[&after_id=<id>]` | `200 { items:[{ id, …campos, created_at, updated_at, deleted_at }], servidor_ahora }`. Máx. 500, orden ascendente por `(updated_at, id)`. Incluye los borrados lógicos. |
| `PUT /api/<recurso>/<id>` | Crea o reemplaza (idempotente). Valida con Zod y descarta campos no declarados. `200` con el documento. |
| `DELETE /api/<recurso>/<id>` | Borrado lógico (`deleted_at`). `200 { ok: true }`; `404` si no existe. |

Paginación: la primera llamada devuelve filas con `updated_at > since`. Para
continuar una página completa, enviar los valores del último elemento:
`since=updated_at` y `after_id=id`. La API devuelve `updated_at > since` o,
cuando el timestamp coincide, `id > after_id`. El orden ascendente por
`(updated_at, id)` evita omitir filas con el mismo timestamp.

Estrategia: la app escribe primero en SQLite (`pending = 1`), un servicio envía
los pendientes cuando hay conexión y luego pide `?since=` para traer cambios.
Conflictos: **gana la última escritura** (`updated_at` del servidor).
Formato de error siempre `{ "error": "mensaje", "detalles"?: [{ "campo", "mensaje" }] }` con códigos 400/401/403/404/409/413/415/429; los errores internos responden `500 Error interno` sin detalles.

### 9.4 Datos de este proyecto en Firestore

```text
usuarios/{uid}/contacto_confianza/{id}
  nombre: string · telefono: string (10 dígitos) · parentesco: string|null · principal: 0|1
usuarios/{uid}/alerta/{id}
  lat: number|null · lng: number|null · precision_m: number|null · bateria_pct: integer|null
  estado: "cancelada"|"mensaje_preparado" · creada_en: ISO
```

**Endpoints propios de este proyecto** (además de los de 9.1 y 9.3):

- `GET /api/alertas/resumen` — conteo de alertas por mes.
- La API **no envía mensajes ni llamadas**: solo registra. El SMS lo envía el usuario desde el redactor del teléfono.
- Datos sensibles: HTTPS obligatorio, nada de ubicaciones ni teléfonos en los logs, y `DELETE /api/mi-cuenta` que borra todo.

### 9.5 Seguridad de la API (se evalúa)

- Valide **todo** con Zod; solo se guardan los campos declarados. El cliente nunca decide precios, stock, puntajes, roles ni el `uid`.
- Cada ruta privada verifica el ID token; las de administración verifican además el claim `rol`.
- Variables de entorno de la API: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (en Vercel pegue la clave con `\n` literales y conviértalos a saltos de línea al iniciar), `FIREBASE_WEB_API_KEY` y las propias del proyecto. **Nunca** en Git ni en la app.
- Los errores internos no se devuelven al cliente; no registre contraseñas, tokens ni datos personales en los logs.
- Limite la tasa de intentos de login (p. ej. con el Firewall de Vercel) antes de usar datos reales.

## 10. Criterios de aceptación

1. Dado que mantengo el botón 3 s, entonces empieza la cuenta regresiva y puedo cancelarla con un toque.
2. Dado que no cancelo, entonces se abre el redactor de SMS con mis contactos y el enlace de mi ubicación.
3. Dado un dispositivo sin SMS disponible, entonces la app lo avisa y ofrece copiar el mensaje.
4. Dado que niego la ubicación, entonces el mensaje se compone sin coordenadas y lo dice.

## 11. Pruebas mínimas (Jest + jest-expo + React Native Testing Library)

- Lógica pura: detector de tres sacudidas en 2 s con lecturas simuladas.
- Utilidad: composición del mensaje (con y sin ubicación) y límite de longitud.
- Servicio: la cuenta regresiva cancelada no abre el redactor.
- Los sensores se prueban con *mocks*: separe la lógica (función pura) de la lectura del sensor.
- En la API (Vitest): al menos 3 pruebas de rutas — una de autenticación (401 sin token), una de validación (400) y una de autorización (aislamiento entre usuarios o rol). Simule Firebase (`vi.mock`) o use el emulador de Firestore.

## 12. Reto opcional

Compartir la ubicación cada minuto mientras la app esté abierta (con aviso visible).

## 13. Puesta en marcha (resumen)

```bash
# App móvil
npx create-expo-app@latest 36-boton-de-seguridad-app
cd 36-boton-de-seguridad-app
npx expo install expo-sqlite expo-secure-store react-native-gesture-handler react-native-reanimated expo-sms expo-location expo-battery expo-haptics expo-sensors
# .env (URL pública, NO secreta):  EXPO_PUBLIC_API_URL=https://<su-api>.vercel.app
npx expo start

# API (otro repositorio)
npx create-next-app@latest 36-boton-de-seguridad-api --ts --app
cd 36-boton-de-seguridad-api
npm i firebase-admin zod
npm i -D vitest
```

**Servicios a configurar:** (1) proyecto de Firebase con *Authentication → Email/Password* habilitado y *Firestore* en modo producción con reglas que niegan todo; (2) cuenta de servicio (clave privada) y clave de API web; (3) proyecto en Vercel con las variables de entorno y despliegue (`vercel deploy --prod`); (4) comprobar `GET /api/health` desde el teléfono.

## 14. Configuración de la IA del proyecto (reto adicional)

Antes de usar un asistente de IA en este proyecto, el equipo debe **diseñar y configurar su propia configuración de IA**. No se entrega una configuración hecha: pensarla, construirla y comprobarla es parte del reto. Los requisitos detallados y cómo se evalúan se explican en clase (hoja «Configuración de IA»). La configuración queda versionada en el **primer commit** de **cada repositorio** (app y API) y debe cubrir:

- **Reglas del proyecto** para la IA: un archivo de instrucciones propio (stack, comandos, estructura, lo que sí y lo que no).
- **Restricciones de seguridad:** la IA **no puede leer** `.env`, claves ni credenciales, **no puede salir de la carpeta** del proyecto y las acciones con efecto fuera de su máquina piden permiso.
- **Reglas de calidad del código** que se comprueban de forma automática, también sobre el código que escriba la IA.
- **Evidencia:** pruebas propias que demuestren que las restricciones funcionan, guardadas en la carpeta `ia/`, y la bitácora de IA.

Todo debe poder **demostrarse en vivo** en la sustentación.

## 15. Entregables y evaluación

| Hito | Semana | Peso | Entrega para este proyecto |
|---|---|---|---|
| 1 | 4 | 15 % | Interfaz navegable, formularios validados, **gestos** y **un sensor** funcionando (con alternativa). **Configuración de IA (sección 14) en el primer commit de cada repositorio.** |
| 2 | 7 | 15 % | SQLite: modelo, migración, CRUD, búsqueda, funcionamiento sin conexión |
| 3 | 12 | 15 % | API en Vercel (Next.js + Firebase Auth/Firestore), login con renovación de token, sincronización, **segundo sensor** |
| 4 | 15 | 15 % | Pruebas, accesibilidad, seguridad, **APK generado con EAS Build**, bitácora de IA. **Evidencias de la configuración de IA (sección 14)** demostradas en vivo. |

**Cada equipo entrega:** (1) repositorio de la app, (2) repositorio de la API, (3) URL de la API desplegada, (4) enlace de descarga del APK (EAS) o el archivo, (5) `README` con instrucciones y capturas, (6) bitácora de IA (propósito, evidencia, validación, decisión) y carpeta `ia/` con las evidencias de la configuración de IA (sección 14), (7) historial Git con commits de ambos integrantes.

**Lista de verificación de seguridad:**

- [ ] Ningún secreto en el repositorio de la app ni en el APK (busque con `grep -r` y revise el bundle antes de entregar). La app **no** contiene `firebaseConfig`.
- [ ] `.env*` en `.gitignore`; `FIREBASE_PRIVATE_KEY`, `FIREBASE_WEB_API_KEY` solo en Vercel.
- [ ] Reglas de Firestore: `allow read, write: if false`.
- [ ] Tokens en `expo-secure-store`, nunca en `AsyncStorage`.
- [ ] HTTPS en todas las llamadas; sin `localhost` en el APK.
- [ ] Permisos mínimos declarados en `app.json`.
- [ ] Configuración de IA propia en app y API (sección 14): la IA no lee `.env*`, keystores ni claves y no sale de la carpeta del repositorio; evidencias en `ia/`.
