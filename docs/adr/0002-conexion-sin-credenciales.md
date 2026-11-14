# ADR-0002 · Conexión con la API sin credenciales en la app

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Quién decide:** el equipo (proyecto de curso)

## Contexto

Todo lo que empiece por `EXPO_PUBLIC_` **queda dentro del APK** y cualquiera puede leerlo. El documento 36 exige que la app no contenga `firebaseConfig`, claves de Firebase ni de servicios de terceros, y que todos los secretos vivan en Vercel. Aun así la app necesita identificarse ante la API.

## Decisión

- La app solo conoce **`EXPO_PUBLIC_API_URL`** y los **tokens de sesión del usuario**.
- El login lo hace la API (que guarda `FIREBASE_WEB_API_KEY` en su entorno) y devuelve `token` (ID token), `refreshToken` y `expiraEnSeg`.
- Los tokens se guardan en **`expo-secure-store`**, nunca en `AsyncStorage`.
- Cada llamada privada lleva `Authorization: Bearer <token>`. Ante `401`, un **único** intento de `POST /api/auth/refresh` y reintento; si falla, se borra la sesión y se vuelve al login.
- La app **no** habla con Firestore ni con Firebase Auth directamente.
- La URL se valida: HTTPS fuera de desarrollo; `localhost` solo permitido en desarrollo.
- El contrato vive en `docs/api-contrato.md` y se versiona en los dos repositorios.

## Alternativas consideradas

- **SDK web de Firebase en la app:** incluye `firebaseConfig` en el APK. Rechazada.
- **Una "API key" fija en la app:** también queda en el APK y no identifica a la persona. Rechazada.
- **Sesiones por cookie:** poco natural en una app móvil offline-first.

## Consecuencias

- Si se filtra el APK no se filtran credenciales, solo la URL pública.
- La disponibilidad de la app depende de la API para el login y la sincronización; el uso local (contactos, historial) funciona sin conexión.
- Los cambios de contrato deben hacerse en los dos repositorios y coordinarse con el orquestador.
