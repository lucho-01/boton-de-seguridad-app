# Spec M3 · Cuenta regresiva de 5 s cancelable

- **Estado:** Aprobada
- **Feature:** M3 — Cuenta regresiva de 5 s cancelable (pan o botón)
- **Fecha:** 2026-11-18
- **Aprobada por:** la persona el 2026-11-18 (respuestas a las preguntas abiertas)

## 1. Contexto y objetivo

Después de armar la alerta (M2), la app espera **5 s** antes de preparar el mensaje: ese margen es la última oportunidad para cancelar un aviso enviado sin querer. Al terminar la cuenta, M3 deja la alerta **lista** (el SMS y la ubicación llegan en M8/M10).

**Al terminar:** el armado de M2 desemboca en una cuenta regresiva visible de 5 s que se puede cancelar deslizando o con un botón; al cancelar no queda registro de alerta.

## 2. Alcance

- **Incluye:**
  - Estado nuevo `countdown` en `useArmadoController` (M2: `idle` → `arming` → `armada`), que arranca automáticamente al completarse el armado; al terminar pasa a `lista`.
  - Servicio puro de la cuenta con tiempo inyectado (`restante`, `progreso`, `completada`).
  - Vista de la cuenta: número de segundos restantes, progreso circular y texto accesible.
  - Cancelación por **deslizamiento a la derecha** y por **botón** (alternativa accesible).
  - Estado final `lista`: texto «Cuenta terminada» y botón «Volver al inicio» (M10 lo sustituye por el redactor de SMS).
  - Anuncios para lector de pantalla al iniciar la cuenta y al cancelarla.
  - Pruebas: servicio puro en 0/1/4999/5000/6000 ms, controlador con tiempo falso, render y cancelación.
- **No incluye:** ubicación (M8), batería (M9), composición del mensaje, apertura del redactor ni historial (M10–M13), vibración por segundo (M9), detección por sacudida (M7).

## 3. Pantalla y gestos

Ruta `(tabs)/index`, sustituyendo el estado `armada` de M2.

| Elemento         | Detalle                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Cuenta regresiva | Número grande «5», «4», «3», «2», «1» y anillo/barra con el avance                                              |
| Texto de estado  | «Alerta en 5 s», con el restante visible y **sin** live region (la voz solo anuncia el inicio y la cancelación) |
| Botón «Cancelar» | `accessibilityRole="button"`, `accessibilityLabel="Cancelar la alerta"`, ≥ 44 × 44                              |
| Botón «Volver»   | Tras la cuenta: `accessibilityLabel="Volver al inicio"`, vuelve a `idle`                                        |
| Aviso 123        | Siempre visible (RF-06)                                                                                         |

- **Gesto — deslizar hacia la derecha:** durante `countdown`, deslizar el control de cancelar hacia la derecha con un umbral de **96 px** cancela la cuenta; si se suelta antes del umbral, el control vuelve a su sitio y la cuenta continúa.
- **Alternativa accesible:** botón «Cancelar la alerta» con una sola pulsación; no depende del gesto.
- Estados: `idle` → `arming` → `countdown` → `lista`; desde `countdown` se puede volver a `idle` cancelando.
- Durante `countdown`, tocar o mantener el botón SOS **no hace nada** (R6).
- El lector de pantalla anuncia **solo** el inicio de la cuenta («Cuenta regresiva iniciada») y la cancelación («Alerta cancelada»); el número visible no se repite por voz cada segundo.

## 4. Sensores y permisos

| Capacidad      | Uso                                                                                    | Si falta                           |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| `expo-haptics` | Vibración breve al iniciar la cuenta y al cancelar (M9 añade la vibración por segundo) | Se omite; la cuenta funciona igual |

- `Haptics.isAvailableAsync()` antes de vibrar; ningún permiso adicional.
- Sin ubicación, batería, SMS ni acelerómetro en este hito.

## 5. Reglas de negocio

| #   | Regla                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------- |
| R1  | Al completarse el armado (3000 ms), la cuenta arranca sola y dura **5000 ms**.                                       |
| R2  | El restante mostrado es `ceil((5000 - transcurrido) / 1000)`, entre 5 y 1; a los 5000 ms la cuenta termina.          |
| R3  | El progreso de la cuenta es `min(1, transcurrido / 5000)` con el tiempo inyectado (`now: Date`) en el servicio puro. |
| R4  | Cancelar (gesto o botón) vuelve a `idle`, deja el progreso en 0 y **no** crea ningún registro de alerta.             |
| R5  | El botón alternativo produce exactamente el mismo resultado que el gesto de deslizar.                                |
| R6  | Mientras `countdown`, el estado es el único que se actualiza; tocar el botón SOS no reinicia ni duplica la cuenta.   |
| R7  | Al desmontar la pantalla se cancela el temporizador; al pasar la app a segundo plano se cancela la cuenta.           |
| R8  | Al llegar a 5000 ms se pasa a `lista` con «Cuenta terminada» y el botón «Volver al inicio»; no se envía nada.        |
| R9  | Textos en español, objetivos táctiles ≥ 44 × 44 y el aviso 123 siempre visible.                                      |

## 6. Datos y contrato con la API

- Ninguno: M3 no toca SQLite ni la API. El registro de la alerta llega en M13.

## 7. Errores y fallo seguro

| Situación                      | Qué ve la persona                                    |
| ------------------------------ | ---------------------------------------------------- |
| Haptics no disponible          | Nada especial; número y anillo bastan                |
| App al fondo durante la cuenta | La cuenta se cancela y se anuncia «Alerta cancelada» |
| Deslizamiento incompleto       | El control vuelve a su sitio; la cuenta sigue        |

## 8. Criterios de aceptación

1. Dado el armado completo, cuando pasan 5 s, entonces la pantalla muestra `lista` con «Cuenta terminada» y «Volver al inicio».
2. Dado `countdown`, cuando pulso «Cancelar la alerta», entonces vuelvo a `idle` sin registro.
3. Dado `countdown`, cuando deslizo 96 px o más a la derecha, entonces ocurre lo mismo que con el botón.
4. Dado `countdown`, cuando deslizo poco y suelto, entonces el control vuelve a su sitio y la cuenta continúa.
5. Dado `countdown`, cuando la app pasa a segundo plano, entonces la cuenta se cancela y se anuncia «Alerta cancelada».
6. Dado un lector de pantalla, cuando la cuenta inicia, entonces se anuncia el inicio y el botón de cancelar es alcanzable.

## 9. Pruebas previstas

- Servicio puro `evaluarCuenta({ inicio, ahora })` con `now` inyectado: 0, 1, 4999, 5000 y 6000 ms.
- Controlador: arranque automático desde `armada`, progreso, cancelación por método, fin de cuenta (`lista`), «Volver al inicio», desmontaje y segundo plano.
- Render: número visible, botón de cancelar alcanzable, aviso 123 visible y resultado del gesto con Gesture Handler simulado.

## 10. Preguntas abiertas

| #   | Pregunta                                                                        | Propuesta                                                                                                     | Respuesta de la persona                                             |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | ¿Qué muestra la app al terminar los 5 s en M3, cuando todavía no existe el SMS? | Estado `lista` con «Cuenta terminada» y botón «Volver al inicio»; M10 lo sustituye por el redactor            | **Estado `lista` + «Cuenta terminada» + «Volver al inicio»**        |
| 2   | ¿Cómo es el gesto de cancelar (sentido y superficie)?                           | Deslizar el botón de cancelar hacia la **derecha** con umbral de ~96 px; el botón sigue siendo la alternativa | **Deslizar a la derecha, umbral 96 px**; el botón es la alternativa |
| 3   | ¿La cuenta se cancela si la app pasa a segundo plano?                           | Sí: cancelar (coherente con M2) y anunciar «Alerta cancelada»                                                 | **Sí, cancelar** y anunciar                                         |
| 4   | ¿Qué pasa si la persona toca el botón SOS durante la cuenta?                    | Se ignora; solo se cancela con el gesto o el botón de cancelar                                                | **Ignorar el toque**                                                |
| 5   | ¿La cuenta se anuncia con lector de pantalla cada segundo?                      | No: solo al iniciar la cuenta y al cancelar, para no saturar                                                  | **Solo inicio y cancelación**                                       |
| 6   | ¿La vibración por segundo entra en M3 o en M9?                                  | Dejarla en M9 (como dice `docs/features.md`); M3 vibra solo al iniciar y al cancelar                          | **Dejar la vibración por segundo para M9**                          |

## 11. Decisiones y dependencias

- Sin dependencias nuevas: Reanimated y Gesture Handler ya están instalados.
- Depende de M2 (controlador y estados) y prepara M8/M10.
- Si el estado final requiere persistencia, se pospone a M13 (no en M3).
- **Ajuste de la revisión de seguridad (2026-11-19):** la tabla de §3 declaraba `accessibilityLiveRegion="polite"` en el texto de estado, pero esa región hace que el lector de pantalla repita el número cada segundo. Se quita: la cuenta se anuncia al iniciarse (`AccessibilityInfo.announceForAccessibility`) y al cancelarse, como fija la regla de §3.
