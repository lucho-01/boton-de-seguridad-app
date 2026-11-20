# Spec M8 · Ubicación al terminar la cuenta

- **Estado:** Aprobada
- **Feature:** M8 — Ubicación al terminar la cuenta (permiso explicado, alternativa sin ubicación) (`docs/features.md`)
- **Fecha:** 2026-11-19
- **Aprobada por:** la persona el 2026-11-19 (respuestas a las 3 preguntas abiertas)

## 1. Contexto y objetivo

Cuando la cuenta regresiva de 5 s termina y la alerta pasa al estado `lista`, la app debe obtener la ubicación de la persona para incluirla en el mensaje de SMS que se preparará en M10.

**Al terminar:** al llegar al estado `lista`, la app solicita ubicación al dispositivo y la guarda para componer el mensaje en M10.

## 2. Alcance

- **Incluye:**
  - Solicitud de permiso de ubicación al sistema (`expo-location`) cuando la cuenta termina y pasa a `lista`.
  - Lectura de coordenadas (latitud, longitud, precisión) del dispositivo.
  - Almacenamiento de la ubicación en el estado `lista` para que M10 la use al componer el SMS.
  - Alternativa sin ubicación: si la persona niega el permiso o el dispositivo no tiene GPS, la alerta sigue funcionando y el mensaje se compone sin coordenadas (se indica en el mensaje).
  - Pruebas: servicio puro de validación de coordenadas, controlador con sensor simulado (permitido / denegado / error), render de pantalla con estado `lista`.
- **No incluye:**
  - Envío de SMS ni redactor de mensajes: es M10.
  - Batería en el mensaje: es M9.
  - Sincronización de alertas con la API: es M14.
  - Historial de alertas: es M12.

## 3. Pantalla y gestos

No hay pantalla nueva; se integra en `app/(tabs)/index.tsx` (pestaña «Alerta») cuando el estado pasa a `lista`.

| Elemento               | Detalle                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Indicador de ubicación | Texto que indica si la ubicación se obtuvo o no, debajo del estado «Cuenta terminada». |
| Permiso de ubicación   | Se solicita al pasar a `lista`; si se niega, la app sigue funcionando sin coordenadas. |
| Batería                | No se incluye en M8 (es M9).                                                           |

## 4. Sensores y permisos

| Capacidad       | Uso                                       | Alternativa                         | Permiso                     |
| --------------- | ----------------------------------------- | ----------------------------------- | --------------------------- |
| `expo-location` | Obtener coordenadas al terminar la cuenta | Mensaje sin coordenadas (se indica) | `expo-location` (WhenInUse) |

**Reglas:** `Haptics.isAvailableAsync()` / `expo-location.Location.isEnabledAsync()` antes de usar; permisos solo al activar la función y explicados; `subscription.remove()` al salir; la app no se rompe si falta el sensor.

## 5. Reglas de negocio

| #   | Regla                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Al terminar la cuenta (estado `lista`), se solicita permiso de ubicación al dispositivo.                                                       |
| R2  | Si la persona concede el permiso, se obtienen latitud, longitud y precisión (m).                                                               |
| R3  | Si la persona niega el permiso o el dispositivo no tiene GPS, la cuenta sigue y el mensaje se compone sin coordenadas (se indica en el texto). |
| R4  | La ubicación se guarda en el estado `lista` para que M10 la use al componer el SMS.                                                            |
| R5  | No se guarda coordenada alguna si la persona no da el permiso.                                                                                 |

## 6. Datos y contrato con la API

- **Sin API en M8:** la ubicación se guarda solo localmente en el estado `lista` para que M10 la use al componer el SMS.
- **Sin SQLite en M8:** la persistencia en SQLite de la alerta (incluyendo ubicación) es M13/M14.
- El modelo `Alerta` de `src/models/index.ts` ya tiene campos `lat`, `lng`, `precision_m`, `bateria_pct`, `estado`, `creada_en`.

## 7. Errores y fallo seguro

| Situación                     | Qué ve la persona                                                               |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Permiso de ubicación denegado | La cuenta sigue; el mensaje se compone sin coordenadas (lo indica en el texto). |
| GPS no disponible             | Lo mismo que denegar permiso: mensaje sin coordenadas.                          |
| Error al leer ubicación       | Lo mismo que denegar permiso; la app no se rompe.                               |

## 8. Criterios de aceptación

1. Dado que termina la cuenta (estado `lista`), entonces se solicita el permiso de ubicación.
2. Dado que la persona concede el permiso, entonces se obtienen latitud y longitud y se muestran en pantalla.
3. Dado que la persona niega el permiso, entonces la cuenta sigue y el mensaje se compone sin coordenadas (se indica).
4. Dado que no hay GPS, entonces la cuenta sigue y el mensaje se compone sin coordenadas.

## 9. Pruebas previstas

- Servicio puro: validación de coordenadas (latitud entre -90 y 90, longitud entre -180 y 180, precisión ≥ 0).
- Controlador con sensor simulado: permiso concedido, denegado, error de lectura.
- Render de pantalla: estado `lista` muestra ubicación o indica que no se obtuvo.

## 10. Preguntas abiertas

| #   | Pregunta                                                            | Propuesta                                                                            | Respuesta de la persona                            |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | ¿La ubicación se pide automáticamente al terminar la cuenta?        | Sí, automáticamente al llegar a `lista` (menos pasos para la persona en emergencia). | **Sí, automáticamente al llegar a `lista`**        |
| 2   | ¿El estado `lista` muestra las coordenadas en pantalla?             | Sí, mostrando latitud y longitud obtenidas.                                          | **Sí, mostrando latitud y longitud obtenidas**     |
| 3   | ¿Cuántos intentos de lectura de ubicación se hacen antes de fallar? | Un intento; si falla, se sigue sin coordenadas.                                      | **Un intento; si falla, se sigue sin coordenadas** |

## 11. Decisiones y dependencias

- Depende de M3 (estado `lista` y cuenta regresiva).
- M10 (SMS) usará la ubicación guardada en el estado `lista` para componer el mensaje con enlace de mapa.
- No hay dependencias nuevas de librerías: `expo-location` ya está instalada (Expo SDK 58).
- No hay dependencia cruzada con la API en M8 (la sincronización de alertas es M14).
