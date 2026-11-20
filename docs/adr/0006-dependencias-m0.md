# ADR-0006 · Dependencias de M0 instaladas con `npx expo install`

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Decisor:** la persona (respuestas 1 y 7 de `docs/specs/m0-base-expo-router-sesion-cliente-http.md`)

## Contexto

`AGENTS.md` §2 fija el stack (Expo, Expo Router, SQLite, SecureStore, gesture-handler, Reanimated, sensores y Zod), pero el repositorio solo tenía `zod` y las herramientas de calidad. `AGENTS.md` §10 exige un ADR para cualquier dependencia nueva. El SDK de Expo es la pieza que fija las versiones compatibles entre `react-native`, `expo-*`, `jest-expo` y Babel.

## Decisión

1. Se instala el **SDK estable actual de Expo** y sus dependencias con `npx expo install`, que resuelve las versiones compatibles entre sí. Solo quedan instaladas las del stack del documento 36.
2. Dependencias de ejecución: `expo`, `expo-router`, `react-native`, `expo-sqlite` (instalada en M0, usada en M13), `expo-secure-store`, `react-native-gesture-handler`, `react-native-reanimated`, `expo-sms`, `expo-location`, `expo-battery`, `expo-haptics`, `expo-sensors`, `react-native-safe-area-context`, `react-native-screens`.
3. Dependencias de desarrollo: `jest-expo`, `@testing-library/react-native`, `@types/react`, `babel-preset-expo` y `eslint-config-expo`.
4. `babel.config.js` usa `babel-preset-expo`; `tsconfig.json` extiende `expo/tsconfig.base`; Jest usa el preset `jest-expo` para `app/`, `src/` y `__tests__/`, manteniendo la compilación Node para `ia/`.

## Alternativas descartadas

- **Fijar manualmente cada versión:** se desincroniza con el SDK y produce errores difíciles de diagnosticar.
- **`create-expo-app` sobre el repo:** reescribe configuración ya validada (guard, agentes, pruebas de `ia/`).

## Consecuencias

- `package.json` y `package-lock.json` cambian; `npm run check` cubre el código nuevo con las mismas reglas.
- Las pruebas de `ia/` siguen ejecutándose sin Expo, porque validan la configuración del harness, no la app.
- Cualquier dependencia fuera de esta lista requiere un ADR nuevo.
