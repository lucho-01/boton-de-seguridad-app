# 36 · Botón de seguridad — App móvil

App de alerta SOS con contactos de confianza: manten presionado 3 s, cuenta regresiva de 5 s cancelable y, si no cancelas, se abre el redactor de SMS con tu ubicación y la batería. **La app nunca envía SMS en silencio.** Funciona sin conexión con SQLite y sincroniza con la API en otro repositorio.

Stack: Expo + React Native + TypeScript + Expo Router, `expo-sqlite`, `expo-secure-store`, `react-native-gesture-handler`, `react-native-reanimated`, `expo-sms`, `expo-location`, `expo-battery`, `expo-haptics`, `expo-sensors`, Zod, Jest.

## Estado

Configuración de IA montada y versionable: agentes, skills, guard, permisos, documentación y evidencias en `ia/`. **El código de la app todavía no existe**: se agrega al construir **M0** (ver `docs/features.md` y `docs/progreso.md`).

## Conexión con la API

Este repo es la mitad móvil del proyecto **36**. La otra mitad es **`boton-de-seguridad-api`** (Next.js + Firebase Admin + Firestore en Vercel). El contrato completo está en `docs/api-contrato.md`.

- La app solo conoce **`EXPO_PUBLIC_API_URL`** (pública, queda dentro del APK) y los **tokens del usuario**.
- Los tokens se guardan en `expo-secure-store`; ante `401` se renueva **una vez** con `/api/auth/refresh`.
- **Ninguna credencial en la app:** ni `firebaseConfig`, ni `FIREBASE_*`, ni claves de servicio. Todo eso vive en Vercel.
- La app no habla con Firestore ni con Firebase Auth: todo pasa por la API.

## Empezar

```bash
npm install
npm run check
```

Después, copia `.env.example` a `.env` y pon la URL de tu API. Sigue `docs/empezar.md`.

## Comandos

| Comando             | Qué hace                                                   |
| ------------------- | ---------------------------------------------------------- |
| `npm start`         | Expo / Metro (dispositivo físico)                          |
| `npm run check`     | Formato + lint + tipos + pruebas (definición de terminado) |
| `npm test`          | Jest (incluye las pruebas de `ia/`)                        |
| `npm run lint`      | ESLint: reglas, `any`/`unknown`, ternarios y fronteras     |
| `npm run typecheck` | `tsc --noEmit`                                             |
| `npm run format`    | Formato con Prettier                                       |

## Configuración de IA

Solo **OpenCode**:

```text
AGENTS.md                      reglas del proyecto para la IA
opencode.json                  permisos: secretos móviles, rutas y comandos
.opencode/agents/              lead, screens, data, api, tests, security
.opencode/skills/              feature-workflow, write-spec, mvc-expo, security-review, handoff-note
.opencode/guard/rules.ts       reglas puras del guard
.opencode/plugins/guard.ts     hook que las aplica antes de cada herramienta
ia/bitacora-ia.md              bitácora (propósito, evidencia, validación, decisión)
ia/pruebas/                    pruebas automáticas y guion de demostración en vivo
```

Restricciones demostrables:

1. La IA **no lee** `.env`, keystores, `google-services.json` ni credenciales (solo `.env.example`).
2. La IA **no sale** de la carpeta del repositorio.
3. `git push`, `eas build`, `expo publish`, `vercel`, `firebase` y `curl` **requieren autorización** y el guard los bloquea.
4. La calidad se comprueba con `npm run check`, también sobre el código de la IA.

## Estructura

```text
app/                Pantallas (Expo Router) — se crean con M0
src/                models, db, repositories, services, controllers, sensors, api, sync, components
docs/               producto, api-contrato, features, arquitectura, specs, ADR, handoffs
ia/                 configuración de IA: bitácora y pruebas
```

## Seguridad

- `.env*`, keystores y `google-services.json` fuera de git.
- Tokens solo en `expo-secure-store`.
- HTTPS en producción; sin `localhost` en el APK.
- Sin coordenadas, teléfonos ni tokens en los logs.
- Permisos mínimos declarados en `app.json`.
