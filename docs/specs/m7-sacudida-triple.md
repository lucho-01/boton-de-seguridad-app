# Spec M7 · Sacudida triple con acelerómetro (opcional, con alternativa por botón)

- **Estado:** Aprobada
- **Feature:** M7 — Sacudida triple con acelerómetro (opcional, con alternativa por botón) (`docs/features.md`)
- **Fecha:** 2026-11-19
- **Aprobada por:** la persona el 2026-11-19 (respuestas a las 3 preguntas abiertas)

## 1. Contexto y objetivo

Una persona que camina sola puede no poder mantener presionado el botón SOS durante 3 s (por ejemplo, lleva bolsas o tiene movilidad reducida en una mano). La detección de sacudida triple permite iniciar la cuenta de emergencia con un movimiento rápido del dispositivo, sin necesidad de sostener el botón.

**Al terminar:** la app detecta una sacudida triple (3 picos de aceleración dentro de una ventana de tiempo) y arranca la cuenta regresiva de 5 s de M3, con su botón de cancelar y su alternativa accesible.

## 2. Alcance

- **Incluye:**
  - Detección de sacudida triple usando `expo-sensors` (Accelerometer).
  - Umbral de aceleración y ventana de tiempo tomados de los ajustes de M6 (15 m/s², 2000 ms).
  - Alternativa por botón para iniciar la cuenta (quien no puede hacer el gesto).
  - Estado `arming` del controlador de M2/M3 (reutiliza el flujo existente).
  - Anuncio para lector de pantalla al iniciar la cuenta desde la sacudida.
  - Pruebas: servicio puro de detección de sacudidas, controlador con sensor simulado, render de pantalla (sin dispositivo real).
- **No incluye:**
  - SMS, ubicación, batería: es M8/M9/M10.
  - Historial de alertas: es M12.
  - Sincronización con la API: es M14.
  - Ajustes de sensibilidad: ya están en M6 (pantalla de ajustes).
  - Registro e ingreso: es M1 (M7 funciona sin sesión).

## 3. Pantalla y gestos

No añade nueva pantalla; se integra en la pestaña «Alerta» (`app/(tabs)/index.tsx`), que ya muestra el botón SOS y el estado de la detección.

| Elemento                     | Detalle                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Gesto de sacudida            | Tres picos de aceleración por encima del umbral dentro de la ventana de tiempo inician la cuenta de 5 s.      |
| Botón «Iniciar con sacudida» | Alternativa accesible al gesto: inicia la cuenta con una sola pulsación (para quien no puede hacer el gesto). |
| Indicador visual             | Texto que indica si la detección por sacudida está activa o no disponible.                                    |
| Aviso 123                    | Siempre visible (RF-06), ya en `PantallaConAviso`.                                                            |

**Regla de gesto = acción + alternativa accesible:** el gesto de sacudida tiene el botón «Iniciar con sacudida» como alternativa accesible (AGENTS.md §8.1).

## 4. Sensores y permisos

| Capacidad                      | Uso                      | Alternativa                  | Permiso                                                 |
| ------------------------------ | ------------------------ | ---------------------------- | ------------------------------------------------------- |
| `expo-sensors` (Accelerometer) | Detectar sacudida triple | Botón «Iniciar con sacudida» | Ninguno (Expo 58 no requiere permiso para acelerómetro) |

**Reglas:** `Haptics.isAvailableAsync()` / `Accelerometer.isAvailableAsync()` antes de usar; `subscription.remove()` al desmontar; la app no se rompe si falta el sensor.

## 5. Reglas de negocio

| #   | Regla                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | La sacudida triple se detecta con el umbral de **15 m/s²** y ventana de **2000 ms** definidos en los ajustes de M6.                  |
| R2  | Tres picos de aceleración por encima del umbral dentro de la ventana inician la cuenta de 5 s (estado `arming` → `countdown` de M3). |
| R3  | Mientras hay una cuenta en curso (arming/countdown/lista), la sacudida no reinicia ni duplica la cuenta (R6 de M2/M3).               |
| R4  | Si el acelerómetro no está disponible, la sacudida no se detecta y la app sigue igual (fallo seguro).                                |
| R5  | El botón «Iniciar con sacudida» inicia la cuenta con una sola pulsación, sin necesidad de hacer el gesto.                            |
| R6  | Al iniciar la cuenta desde la sacudida, se anuncia «Cuenta regresiva iniciada» (igual que M3).                                       |
| R7  | La suscripción al acelerómetro se cancela al desmontar la pantalla (R7 de M2/M3).                                                    |

## 6. Datos y contrato con la API

- **Sin API en M7.** No hay cambios en `docs/api-contrato.md` ni dependencia cruzada con el repo `boton-de-seguridad-api`.
- Los valores de umbral y ventana se leen de `src/services/ajustes.ts` (valores por defecto o valores guardados por la persona en M6).

## 7. Errores y fallo seguro

| Situación                  | Qué ve la persona                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Acelerómetro no disponible | La sacudida no se detecta; la app sigue igual; el botón alternativo sigue funcionando. |
| Sacudida durante la cuenta | Se ignora; no reinicia ni duplica la cuenta.                                           |
| Error al leer el sensor    | Se absorbe (fallo seguro); la app sigue igual.                                         |

## 8. Criterios de aceptación

1. Dado que hago una sacudida triple (3 picos > 15 m/s² en 2000 ms), entonces arranca la cuenta de 5 s.
2. Dado que hago una sacudida de menos de 3 picos o por debajo del umbral, entonces no arranca nada.
3. Dado que hay una cuenta en curso, cuando hago una sacudida triple, entonces la cuenta no se reinicia ni se duplica.
4. Dado que el acelerómetro no está disponible, cuando sacudo, entonces no ocurre nada y la app sigue funcionando.
5. Dado que pulso el botón «Iniciar con sacudida», entonces arranca la cuenta de 5 s igual que con el gesto.
6. Dado un lector de pantalla, cuando inicia la cuenta desde la sacudida, entonces se anuncia «Cuenta regresiva iniciada».

## 9. Pruebas previstas

- Servicio puro: detección de 3 picos dentro de la ventana, menos de 3 picos no detecta, picos por debajo del umbral no detectan, sacudida durante cuenta en curso no reinicia.
- Controlador con sensor simulado: arranque de cuenta desde sacudida, ignorar durante cuenta en curso.
- Render de pantalla: botón «Iniciar con sacudida» presente y accesible, aviso 123 visible.

## 10. Preguntas abiertas

| #   | Pregunta                                                                                       | Propuesta                                                                                                  | Respuesta de la persona                             |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | ¿La detección de sacudida está activa por defecto al abrir la app?                             | Sí, si el sensor está disponible.                                                                          | **Sí, si el sensor está disponible**                |
| 2   | ¿Hay un botón para activar/desactivar la detección de sacudida en ajustes?                     | No en M7; M6 ya tiene la pantalla de ajustes, pero la activación/desactivación queda para M16 o posterior. | **No, queda para M16 o posterior**                  |
| 3   | ¿El botón «Iniciar con sacudida» está siempre visible o solo cuando el sensor está disponible? | Siempre visible; si no hay sensor, no hace nada.                                                           | **Siempre visible; si no hay sensor, no hace nada** |

## 11. Decisiones y dependencias

- Depende de M6 (valores de umbral y ventana en `src/services/ajustes.ts`).
- Depende de M2/M3 (estados `arming`, `countdown`, `lista` y controlador `useArmadoController`).
- No hay dependencias nuevas de librerías: `expo-sensors` ya está instalado (Expo 58).
- `expo-sensors` no requiere permiso especial en Expo SDK 58.
