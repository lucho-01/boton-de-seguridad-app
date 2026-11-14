---
name: mvc-expo
description: Guía paso a paso para implementar funcionalidades bajo arquitectura MVC en Expo con SQLite, gestos, sensores, accesibilidad y conexión con la API.
---

# Skill: implementación MVC en Expo (Botón de Seguridad)

Cuando se pida crear o modificar una funcionalidad, sigue este orden estricto:

## Paso 1: Capa Model (`src/models/` y `src/repositories/`)

1. Define la interfaz en `snake_case` para coincidir con Firestore y SQLite: `id`, `nombre`, `telefono`, `parentesco`, `remote_id`, `updated_at`, `deleted`, `pending`.
2. Consultas SQLite parametrizadas (`?`) en `src/repositories/`. Nunca concatenes strings en SQL.
3. Los tipos se importan de `src/models`; no se redefinen en pantallas.

## Paso 2: Service y Sensor (`src/services/` y `src/sensors/`)

1. **Regla de pureza:** extrae todo cálculo (umbral de aceleración de 3 sacudidas en 2 s, recorte de 160 caracteres sin cortar el enlace, validación de teléfono) a una función pura en `src/services/`.
2. **Regla de hardware:** en `src/sensors/`, verifica siempre `await Sensor.isAvailableAsync()` antes de suscribirte y limpia en `return () => subscription?.remove()`.
3. Si el sensor o el permiso no están, la función se degrada: la app avisa y sigue.

## Paso 3: Controller (`src/controllers/`)

1. Crea un hook controlador (por ejemplo `useAlertaController.ts`) que conecte servicios, sensores, repositorio SQLite y cliente de la API.
2. Estados explícitos: `idle`, `arming`, `countdown`, `preparing_sms`, `error`.
3. Toda escritura pasa por SQLite primero con `pending = 1`; el sync la envía después.

## Paso 4: Vista (`src/components/` y `app/`)

1. La vista solo recibe estado y callbacks del controller.
2. **Accesibilidad obligatoria:** por cada gesto, un botón alternativa con `accessibilityRole="button"` y `accessibilityLabel` descriptivo.
3. Incluye el aviso educativo permanente (línea 123 en Colombia).

## Paso 5: Conexión con la API (`src/api/`)

1. `EXPO_PUBLIC_API_URL` en un solo módulo; sin credenciales.
2. Tokens con `expo-secure-store`; `Authorization: Bearer <token>`.
3. Ante 401, un único intento de refresh y reintento; si falla, volver al login.
4. Valida toda respuesta con Zod.

## Paso 6: Verificación automática

Ejecuta `npm run typecheck && npm run lint && npm test` antes de finalizar.
