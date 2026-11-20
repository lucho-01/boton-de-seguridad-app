# Spec M0 · Base: Expo Router, sesión y cliente HTTP

- **Estado:** Aprobada
- **Feature:** M0 — Base: Expo Router, Tabs, proveedor de sesión, tokens en `expo-secure-store`, cliente HTTP con refresh y `health`
- **Fecha:** 2026-11-14
- **Aprobada por:** la persona el 2026-11-14 (respuestas a las preguntas abiertas y autorización para instalar dependencias)

## 1. Contexto y objetivo

Hoy el repositorio solo tiene configuración de IA, documentación y pruebas de `ia/`: **no existe código de app**. M0 monta el esqueleto sobre el que se construyen M1–M17: Expo SDK + Expo Router con Tabs, el proveedor de sesión con tokens en `expo-secure-store`, el cliente HTTP con un único refresh ante `401` y la comprobación de `GET /api/health`. Sin M0 no se puede probar nada contra la API.

**Al terminar:** la app arranca en un dispositivo físico, muestra las cuatro rutas del producto (con contenido de relleno en M0), guarda y restaura la sesión del usuario, y sabe decir si la API responde.

## 2. Alcance

- **Incluye:**
  - Dependencias del stack de `AGENTS.md` §2 instaladas con `npx expo install`: `expo`, `expo-router`, `react-native`, `expo-sqlite`, `expo-secure-store`, `react-native-gesture-handler`, `react-native-reanimated`, `expo-sms`, `expo-location`, `expo-battery`, `expo-haptics`, `expo-sensors`, `react-native-safe-area-context`, `react-native-screens`, `jest-expo`, `@testing-library/react-native` y `@types/react`.
  - `app.json` (perfil mínimo, permisos de ubicación según `docs/producto.md`), `babel.config.js` con `babel-preset-expo`, `tsconfig.json` extendiendo `expo/tsconfig.base`, `jest.config` con `jest-expo`.
  - `app/_layout.tsx`: `GestureHandlerRootView`, Stack raíz, proveedor de sesión, aviso permanente (RF-06).
  - Rutas vacías de M0: `app/(tabs)/_layout.tsx`, `index.tsx`, `contactos.tsx`, `historial.tsx` y `app/ajustes.tsx` (solo títulos y el aviso 123; sin lógica de producto).
  - `src/models/` y `src/api/contracts/`: tipos `snake_case` y esquemas Zod de `docs/api-contrato.md` (auth, contacto, alerta, resumen, error).
  - `src/api/`: `config.ts` (solo `EXPO_PUBLIC_API_URL`), `http.ts` (Bearer, 401 → un refresh → reintento), `tokenStore.ts` (`expo-secure-store`), `errors.ts` (`ApiError`), `endpoints` (`health`, `auth/*`).
  - `src/controllers/useSesionController.ts`: expone `{ sesion, iniciando, iniciar, cerrar }` y la comprobación de `health`.
  - Una pantalla mínima de comprobación en `ajustes.tsx`: estado de la API (conectado / sin conexión) y sesión (sin usuario), **sin formulario de login** (eso es M1).
  - Pruebas: cliente HTTP con `fetch` simulado (401 → un refresh → reintento; refresh fallido → sesión borrada), `tokenStore` con mock de `expo-secure-store`, rechazo de `localhost` fuera de desarrollo, y un render básico del layout.
- **No incluye:** registro/login (M1), botón SOS (M2), SQLite y migraciones (M13), sincronización (M14), sensores (M7–M9), mensaje/SMS (M10). Tampoco EAS ni APK (M17).

## 3. Pantalla y gestos

| Ruta               | Contenido en M0                                                      |
| ------------------ | -------------------------------------------------------------------- |
| `(tabs)/index`     | Título «Botón de seguridad» y aviso de que el SOS llega en M2        |
| `(tabs)/contactos` | Título «Contactos» y texto de que llega en M4                        |
| `(tabs)/historial` | Título «Historial» y texto de que llega en M12                       |
| `ajustes`          | Estado de la API y de la sesión; botón «Cerrar sesión» si hay sesión |

- **Gestos:** M0 no introduce gestos nuevos; no hay botón alternativo que añadir.
- **Aviso permanente (RF-06):** componente `src/components/AvisoLinea123.tsx`, visible en todas las pantallas, `accessibilityRole="text"`, texto exacto en `§5 R7`.
- **Accesibilidad:** pestañas y botones con `accessibilityLabel`; objetivos ≥ 44 × 44; textos base de 16; `SafeAreaProvider`.

## 4. Sensores y permisos

- Ningún sensor se suscribe en M0.
- `app.json` declara solo el plugin de `expo-location` con su texto de permiso (se usa en M8) y **no** pide permisos al arrancar.
- Si no hay red, la app arranca y muestra «Sin conexión con el servidor»; nada se bloquea.

## 5. Reglas de negocio

| #   | Regla                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `EXPO_PUBLIC_API_URL` se lee en un único módulo (`src/api/config.ts`) y se le quita la barra final.                                                                                                                                       |
| R2  | Si falta la URL, la app funciona y las llamadas fallan con un `ApiError` de mensaje «Falta configurar el servidor».                                                                                                                       |
| R3  | Fuera de desarrollo (`!__DEV__`) la URL debe empezar por `https://` y no puede contener `localhost` ni `127.0.0.1`; si no, error de configuración.                                                                                        |
| R4  | Los tokens (`token`, `refreshToken`) viven solo en `expo-secure-store` con las claves `token` y `refreshToken`. Nunca en `AsyncStorage` ni en logs.                                                                                       |
| R5  | Ante `401` en una ruta privada: **un solo** `POST /api/auth/refresh` y **un solo** reintento; si el refresh falla se borra la sesión y se avisa al proveedor (`sesion = null`). Nunca más de un refresh por petición ni reenvío en bucle. |
| R6  | Toda respuesta se valida con Zod; una respuesta que no valide se reporta como «Respuesta del servidor no válida».                                                                                                                         |
| R7  | Aviso permanente literal: «Este proyecto es educativo y no reemplaza la línea de emergencias 123.»                                                                                                                                        |
| R8  | `GET /api/health` con `200 { ok: true }` → «Conectado»; cualquier otro resultado o timeout (10 s) → «Sin conexión».                                                                                                                       |
| R9  | Al abrir la app con tokens guardados, `GET /api/auth/yo` confirma la sesión; si falla con `401` tras el refresh, sesión `null`.                                                                                                           |
| R10 | Ninguna credencial en la app: ni `firebaseConfig`, ni `FIREBASE_*`, ni claves de servicio. `.env.example` sigue con una sola variable.                                                                                                    |

## 6. Datos y contrato con la API

- **SQLite:** M0 no crea tablas (M13). Solo se instala `expo-sqlite`.
- **Endpoints de `docs/api-contrato.md` usados en M0:**
  - `GET /api/health` → `{ ok: true, servicio, version }`
  - `POST /api/auth/refresh` → `{ token, refreshToken, expiraEnSeg }`
  - `GET /api/auth/yo` → `{ usuario: { id, email } }`
  - `POST /api/auth/login` y `POST /api/auth/registro` solo se tipifican y prueban en M1; el cliente **debe** quedar listo.
- **Tipos (`src/models/`, `snake_case`):** `Usuario`, `Sesion` (`token`, `refresh_token`, `expira_en_seg`, `usuario`), `ContactoConfianza`, `Alerta`, `EstadoAlerta = "cancelada" | "mensaje_preparado"`.
- **Respuesta de auth en el cable:** `{ token, refreshToken, expiraEnSeg, usuario }` (camelCase tal como lo define el contrato); se valida con Zod y se mapea a `Sesion` en `src/api/`.
- **Errores:** `{ error, detalles? }` → `ApiError { estado, mensaje, detalles }`; `detalles` solo para marcar campos en formularios.
- **Dependencia cruzada:** la API debe estar desplegada con `A1` (auth) y `GET /api/health`. Si no lo está, M0 se prueba con `health` y las pruebas automatizadas simulan `fetch`.

## 7. Errores y fallo seguro

| Situación                   | Qué ve la persona                                    |
| --------------------------- | ---------------------------------------------------- |
| Sin `EXPO_PUBLIC_API_URL`   | «Falta configurar el servidor». La app no se cierra. |
| Sin red / timeout 10 s      | «Sin conexión con el servidor».                      |
| `401` y refresh fallido     | Vuelve a «Sin usuario»; en M1 redirige al login.     |
| Respuesta que no valida Zod | «Respuesta del servidor no válida».                  |
| `429`                       | «Demasiados intentos; espera un momento».            |
| `500`                       | «Error del servidor. Inténtalo más tarde».           |

Nunca se muestran cuerpos de respuesta ni detalles internos; nunca se registran tokens.

## 8. Criterios de aceptación

1. Dado un dispositivo físico con `.env` válido, cuando abro la app, entonces veo las tres pestañas y Ajustes, y el aviso de la línea 123.
2. Dado que la API responde en `health`, cuando abro Ajustes, entonces dice «Conectado»; si apago la red, entonces dice «Sin conexión».
3. Dado un token guardado vencido, cuando la app llama a una ruta privada, entonces hace un solo refresh y un solo reintento.
4. Dado que el refresh falla, cuando la app reintenta, entonces borra los tokens y queda sin sesión.
5. Dado `EXPO_PUBLIC_API_URL` ausente, cuando abro la app, entonces funciona y muestra «Falta configurar el servidor».
6. Dado `npm run check`, entonces formato, lint, tipos y pruebas quedan en verde, incluidas las 14 pruebas de `ia/`.

## 9. Pruebas previstas

- `src/api/__tests__/http.test.ts`: 200 válido; 401 → refresh → reintento (una sola vez); refresh fallido → sesión borrada; respuesta inválida → error de validación; `429`/`500` con su mensaje.
- `src/api/__tests__/tokenStore.test.ts`: guarda, lee y borra con `expo-secure-store` simulado; no usa `AsyncStorage`.
- `src/api/__tests__/config.test.ts`: quita la barra final; rechaza `http://` y `localhost` con `__DEV__ = false`.
- `__tests__/layout.test.tsx`: el aviso 123 está presente y las rutas renderizan (Testing Library).
- Las pruebas de `ia/pruebas/guard.test.ts` siguen en verde.

## 10. Preguntas abiertas

| #   | Pregunta                                                                               | Propuesta                                                                               | Respuesta de la persona                                        |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | ¿Con qué SDK de Expo construimos M0?                                                   | El SDK estable actual (`npx create-expo-app` / `npx expo install`)                      | **SDK estable actual**, con `npx expo install`                 |
| 2   | ¿En M0 mostramos una pantalla de login o dejamos «Ajustes» como comprobación de salud? | Solo comprobación en «Ajustes»; el login es M1                                          | **Solo comprobación en Ajustes**; login en M1                  |
| 3   | ¿Timeout de red?                                                                       | 10 s por petición con `AbortController`                                                 | **10 s por petición** con `AbortController`                    |
| 4   | ¿Dónde vive el estado de sesión?                                                       | Contexto React `src/controllers/sesionContext.tsx` que envuelve a `useSesionController` | **Contexto React** sobre `useSesionController`                 |
| 5   | ¿Se inicializa `expo-sqlite` en M0?                                                    | No: se instala y se usa en M13                                                          | **Solo se instala**; las tablas llegan con M13                 |
| 6   | ¿Reiniciamos la cuenta de expiración para decidir refresh preventivo?                  | No en M0: solo se refresca reactivo ante `401` (R5)                                     | **Solo reactivo ante `401`**; `expiraEnSeg` se guarda para M14 |
| 7   | ¿Autorizas instalar dependencias (`npx expo install`, `npm install`)?                  | Sí, es necesario para M0                                                                | **Sí, autorizado** (2026-11-14)                                |

## 11. Decisiones y dependencias

- **ADR nuevo:** ADR-0006 «Dependencias de M0 y su instalación con `npx expo install`» (el SDK fija versiones compatibles; justifica que por fin entran las dependencias del stack de `AGENTS.md` §2 y `jest-expo`).
- **Cambio de configuración:** `babel.config.js` pasa a `babel-preset-expo` y `tsconfig.json` a `expo/tsconfig.base`; `ia/` se mantiene con Node (las pruebas del guard no dependen de Expo).
- **Dependencias cruzadas:** API desplegada con `A1` y `GET /api/health`.
- **Riesgo:** el guard bloquea `npx expo install` (es `bash` con `ask`); se pedirá autorización explícita a la persona para instalar dependencias.
