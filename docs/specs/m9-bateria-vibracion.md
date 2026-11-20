# Spec M9 — Batería y vibración por segundo

- **Estado:** Aprobada
- **Feature:** M9 — Batería y vibración por segundo (`docs/features.md`)
- **Fecha:** 2026-11-19
- **Aprobada por:** la persona el 2026-11-19 (respuestas a las 4 preguntas abiertas)

## 1. Contexto y objetivo

Durante la cuenta regresiva de 5 s (M3), la app debe mostrar el nivel de batería actual y vibrar cada segundo para darle retroalimentación táctil a la persona sobre el transcurso del tiempo.

**Al terminar:** durante la cuenta regresiva, la app muestra el porcentaje de batería restante y vibra cada segundo, dando retroalimentación háptica de que el tiempo sigue corriendo.

## 2. Alcance

- **Incluye:**
  - Lectura del nivel de batería mediante `expo-battery`.
  - Visualización del porcentaje de batería en la pantalla de la cuenta regresiva.
  - Vibración cada segundo durante la cuenta regresiva (vibración corta).
  - Alternativa visual para quien no tenga háptica (el anillo y el número ya existen).
  - Pruebas: servicio puro para formateo de porcentaje, controlador con sensor simulado, render de pantalla con batería.

- **No incluye:**
  - Vibración durante el armado de 3 s (ya existe en M2, solo al iniciar y completar).
  - Cambio de color o estilo basado en nivel bajo de batería (podría ser M13 o posterior).
  - Notificación de batería baja crítica (podría ser M13 o posterior).

## 3. Pantalla y gestos

No hay nuevos gestos. La batería se muestra como información adicional en la pantalla de la cuenta regresiva (`app/(tabs)/index.tsx`) y el estado `lista`.

| Elemento                | Detalle                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Indicador de batería    | Texto con porcentaje (ej: "Batería: 84%") mostrado durante la cuenta y en estado `lista`. |
| Vibración por segundo   | Vibración corta cada segundo durante la cuenta regresiva.                                 |
| Alternativa sin háptica | El anillo y el número ya existen como retroalimentación visual.                           |

## 4. Sensores y permisos

| Capacidad      | Uso                                   | Alternativa                                         | Permiso                                                |
| -------------- | ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `expo-battery` | Leer nivel de batería y mostrarlo     | No mostrar porcentaje (la cuenta sigue funcionando) | `expo-battery` no requiere permiso especial en Expo 58 |
| `expo-haptics` | Vibrar cada segundo durante la cuenta | Solo visual (anillo y número)                       | `expo-haptics` no requiere permiso especial            |

## 5. Reglas de negocio

| #   | Regla                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------- |
| R1  | Al iniciar la cuenta regresiva, se lee el nivel de batería y se muestra en pantalla.                 |
| R2  | Durante la cuenta, se vibra cada segundo (vibración corta).                                          |
| R3  | Si el dispositivo no tiene háptica, la cuenta funciona igual (solo visual).                          |
| R4  | El porcentaje de batería se muestra como entero (ej: "84%").                                         |
| R5  | La batería se lee al iniciar la cuenta y no se actualiza durante ella (la cuenta dura solo 5 s).     |
| R6  | Si `expo-haptics` no está disponible, no hay vibración pero la cuenta sigue funcionando normalmente. |

## 6. Datos y contrato con la API

- **Sin API en M9.** La información de batería es local del dispositivo y no se envía a la API.

## 7. Errores y fallo seguro

| Situación             | Qué ve la persona                                                          |
| --------------------- | -------------------------------------------------------------------------- |
| Háptica no disponible | No hay vibración, pero la cuenta sigue y se muestra el número y el anillo. |
| Batería no disponible | No se muestra porcentaje, pero la cuenta sigue funcionando normalmente.    |

## 8. Criterios de aceptación

1. Dado que inicia la cuenta regresiva, entonces se lee el nivel de batería y se muestra en pantalla.
2. Dado que corre la cuenta, entonces vibra cada segundo (vibración corta).
3. Dado que el dispositivo no tiene háptica, entonces no hay vibración pero la cuenta funciona igual.
4. Dado que el dispositivo no tiene batería disponible, entonces no se muestra porcentaje pero la cuenta sigue funcionando.

## 9. Pruebas previstas

- Servicio puro: formateo de porcentaje de batería (0%, 50%, 100%).
- Controlador con sensor simulado: batería disponible y no disponible.
- Render de pantalla: muestra porcentaje de batería durante la cuenta y en estado `lista`.
- Prueba de vibración: se llama a `impactAsync` cada segundo durante la cuenta (mock de `expo-haptics`).

## 10. Preguntas abiertas

| #   | Pregunta                                                             | Propuesta                                                                                              | Respuesta de la persona                                              |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | ¿Dónde se muestra el porcentaje de batería?                          | En la pantalla de la cuenta regresiva, debajo del número y del anillo, y también en el estado `lista`. | **Sí, en la pantalla de la cuenta regresiva y en el estado `lista`** |
| 2   | ¿La vibración por segundo es un impacto ligero o medio?              | Impacto ligero (Light) para no ser molesto.                                                            | **Impacto ligero**                                                   |
| 3   | ¿Se vibra también al terminar la cuenta (estado `lista`)?            | No, solo durante los 5 s de la cuenta.                                                                 | **No, solo durante los 5 s de la cuenta**                            |
| 4   | ¿El porcentaje de batería se actualiza durante los 5 s de la cuenta? | No, se lee una sola vez al iniciar la cuenta.                                                          | **No, se lee una sola vez al iniciar**                               |

## 11. Decisiones y dependencias

- Depende de M3 (cuenta regresiva).
- `expo-battery` y `expo-haptics` ya están instaladas (Expo SDK 58).
- No hay dependencias nuevas de librerías.
