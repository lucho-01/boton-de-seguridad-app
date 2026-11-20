# Spec M2 · Botón SOS con long press 3 s y anillo de progreso

- **Estado:** Aprobada
- **Feature:** M2 — Botón SOS con long press 3 s y anillo de progreso
- **Fecha:** 2026-11-14
- **Aprobada por:** la persona el 2026-11-14 (respuestas a las preguntas abiertas)

## 1. Contexto y objetivo

El gesto insignia de la app: la persona **mantiene presionado** el botón SOS durante **3 s** y ve un anillo que avanza; al completarse queda «armada» la alerta y, en M3, arrancará la cuenta regresiva de 5 s. M2 entrega solo el gesto, el progreso visual y el botón alternativo accesible (sin cuenta regresiva ni SMS).

**Al terminar:** en la pestaña «Alerta» hay un botón grande que, al mantenerlo 3 s, recorre un anillo de 0 a 100 % y al soltar antes de tiempo se cancela; una persona que no puede mantener presionado tiene un botón equivalente.

## 2. Alcance

- **Incluye:**
  - Estado del armado en un controlador nuevo: `idle` → `arming` → `armada` (M3 añadirá `countdown`, `preparing_sms`, `error`).
  - Componente del anillo de progreso (Reanimated) y el botón SOS grande, con `long press` de 3 s.
  - Botón alternativo accesible («Activar la alerta sin deslizar» o equivalente) que ejecute el mismo armado; y su equivalente para cancelar mientras se mantiene.
  - Haptics ligera al empezar y al completar el armado (si el dispositivo la tiene).
  - Anuncios para lector de pantalla al armar y al cancelar.
  - Pruebas: servicio puro del umbral de 3 s con tiempo inyectado, controlador y render del botón.
- **No incluye:** cuenta regresiva cancelable (M3), detección por sacudida (M7), ubicación, batería, SMS o historial (M8–M12). M2 **no** escribe en SQLite ni llama a la API.

## 3. Pantalla y gestos

Ruta `(tabs)/index`, sustituyendo el texto de relleno de M0.

| Elemento           | Detalle                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Botón SOS          | Círculo grande (mín. 200 × 200), texto «SOS», `accessibilityRole="button"`                                                                          |
| Anillo de progreso | Arco que recorre 0 → 100 % durante 3 s; también visible como texto «Mantén presionado: 35 %»                                                        |
| Botón alternativo  | `accessibilityRole="button"`, `accessibilityLabel="Armar la alerta con un botón (mantén presionado)"`, texto visible «Armar la alerta con un botón» |
| Aviso 123          | Siempre visible (RF-06)                                                                                                                             |

- **Gesto 1 — mantener presionado 3 s** (`Gesture.LongPress` con `minDuration` desactivado y progreso propio, o `Pressable` con `onLongPress` + `onPressIn`/`onPressOut`): inicia el armado; al soltar antes de 3 s se cancela solo.
- **Alternativa accesible:** el botón alternativo (texto visible «Armar la alerta con un botón»; etiqueta `accessibilityLabel="Armar la alerta con un botón (mantén presionado)"`) con **una sola pulsación** pasa directo a `armada` (R6), sin sostener 3 s.
- **Después de armar:** estado `armada` → texto «Alerta armada» y botón «Desarmar» (vuelve a `idle`); M3 lo sustituye por la cuenta regresiva.
- Los estados se anuncian con `AccessibilityInfo.announceForAccessibility`.

## 4. Sensores y permisos

| Capacidad      | Uso                                       | Si falta                          |
| -------------- | ----------------------------------------- | --------------------------------- |
| `expo-haptics` | Vibración breve al iniciar y al completar | Se omite; el gesto funciona igual |

- `Haptics.isAvailableAsync()` antes de vibrar; ningún permiso adicional.
- Sin acelerómetro (eso es M7).

## 5. Reglas de negocio

| #   | Regla                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| R1  | El armado se completa a los **3000 ms** de mantener presionado; con 2999 ms se cancela.                           |
| R2  | Soltar antes de 3000 ms cancela el armado sin dejar registro de alerta.                                           |
| R3  | Mientras `arming`, el estado es el único que se actualiza; no se puede iniciar un segundo armado simultáneo.      |
| R4  | El progreso mostrado es `min(1, transcurrido / 3000)`, con el tiempo inyectado (`now: Date`) en el servicio puro. |
| R5  | Al completarse, el estado pasa a `armada` y se emite un único aviso `announceForAccessibility`.                   |
| R6  | El botón alternativo produce exactamente el mismo resultado que el gesto (M2: estado `armada`).                   |
| R7  | Al desmontar la pantalla, se cancela el temporizador y se eliminan las suscripciones del gesto.                   |
| R8  | Textos en español, objetivos táctiles ≥ 44 × 44 y el aviso 123 siempre visible.                                   |

## 6. Datos y contrato con la API

- Ninguno: M2 no toca SQLite ni la API. La alerta se registrará en M10/M13.

## 7. Errores y fallo seguro

| Situación                                 | Qué ve la persona                             |
| ----------------------------------------- | --------------------------------------------- |
| Haptics no disponible                     | Nada especial; el anillo y el texto bastan    |
| Lector de pantalla activo                 | Anuncios de «Armando alerta» / «Alerta lista» |
| La pantalla pierde el foco (app al fondo) | Se cancela el armado en curso                 |

## 8. Criterios de aceptación

1. Dado el botón en reposo, cuando lo mantengo 3 s, entonces el anillo llega al 100 % y el estado es `armada`.
2. Dado que mantengo el botón, cuando suelto a los 2 s, entonces el anillo vuelve a 0 y el estado es `idle`.
3. Dado que uso un lector de pantalla, cuando activo el botón alternativo, entonces llego al mismo estado `armada` que con el gesto.
4. Dado que no hay librería de haptics, cuando armo, entonces todo funciona igual y no hay error.

## 9. Pruebas previstas

- Servicio puro `evaluarArmado({ ahora, inicio, esCancelacion })` con `now` inyectado: 2999 / 3000 / 5000 ms.
- Controlador: iniciar, progresar, cancelar, completar, desmontar.
- Render: el gesto de long press y el botón alternativo llegan al mismo estado; el aviso 123 sigue visible.

## 10. Preguntas abiertas

| #   | Pregunta                                                                                       | Propuesta                                                                                   | Respuesta de la persona                                                   |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | ¿Qué pasa al completar el armado en M2 (antes de que exista la cuenta regresiva)?              | Mostrar «Alerta armada» y un botón «Desarmar»; M3 lo reemplaza                              | **«Alerta armada» + «Desarmar»**; M3 lo sustituye por la cuenta regresiva |
| 2   | ¿El botón alternativo para lector de pantalla requiere mantener 3 s o una sola pulsación?      | Una sola pulsación: inicia el armado de inmediato (más seguro para quien no puede sostener) | **Una sola pulsación** inicia el armado de inmediato                      |
| 3   | ¿El anillo se dibuja con Reanimated por fotograma o con una animación de 3 s de duración fija? | Animación de 3 s ligada a `onPressIn`/`onPressOut`: menos estado, se reinicia sola          | **Animación de 3 s fija** ligada a la pulsación                           |
| 4   | ¿Haptics al iniciar y al completar, o solo al completar?                                       | Ambos: una ligera al iniciar y una doble al completar                                       | **Ambos**: ligera al iniciar, doble al completar                          |

## 11. Decisiones y dependencias

- Controlador nuevo `useArmadoController` (zona `data`) con estados `idle` / `arming` / `armada`.
- Sin dependencias nuevas: Reanimated, Gesture Handler y Haptics ya están instalados.
- Depende de M0 (rutas y componentes base) y prepara el terreno de M3 y M7.
