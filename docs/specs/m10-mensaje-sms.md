# Spec M10 — Mensaje SMS con enlace de mapa

- **Estado:** Borrador (pendiente de aprobación)
- **Feature:** M10 — Componer el mensaje (≤ 160 caracteres, enlace de mapa) y abrir el redactor (`docs/features.md`)
- **Fecha:** 2026-11-20
- **Depende de:** M4 (contactos), M8 (ubicación), M9 (batería)

## 1. Contexto y objetivo

Al terminar la cuenta regresiva (estado `lista`), la app ya tiene la ubicación y la
batería. Falta componer el SMS de emergencia y **abrir el redactor nativo** con los
contactos de confianza. La persona pulsa «Enviar»: **la app nunca envía en silencio**.

**Al terminar:** en `lista`, la app muestra el texto exacto que se enviará y un botón
que abre el redactor de SMS con los destinatarios y el mensaje ya escritos. Si no hay
contactos o no hay ubicación, se avisa y no se abre nada.

## 2. Alcance

- **Incluye:**
  - `src/services/mensaje.ts` (puro): enlace de mapa, composición del mensaje y
    recorte a 160 caracteres.
  - `src/sensors/useSms.ts`: envoltorio delgado de `expo-sms` (`disponible` y
    `abrirRedactor(destinatarios, mensaje)`), que absorbe errores.
  - Botón «Abrir mensaje para enviar» en `lista` y vista previa del texto.
  - Pruebas del servicio, del controlador y de la pantalla.

- **No incluye:**
  - Envío automático ni en segundo plano (prohibido por AGENTS.md §9.3).
  - Historial de alertas (M12) ni sincronización (M14).
  - Adjuntar la alerta a la API (M14).

## 3. Pantalla y gestos

No hay gestos nuevos. En `lista` se añade:

| Elemento     | Detalle                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Vista previa | El mensaje completo, en un bloque de solo lectura, para que la persona sepa qué se enviará.                                          |
| Botón        | «Abrir mensaje para enviar» con `accessibilityRole="button"`, `accessibilityLabel` y pista que recuerda que hay que pulsar «Enviar». |
| Avisos       | Sin contactos o sin ubicación: texto visible que explica por qué no se abre el redactor.                                             |

## 4. Sensores y permisos

| Capacidad            | Uso                           | Alternativa                                                          | Permiso  |
| -------------------- | ----------------------------- | -------------------------------------------------------------------- | -------- |
| `expo-sms`           | Abrir el redactor del sistema | Copiar el mensaje al portapapeles (si `expo-sms` no está disponible) | Ninguno  |
| `expo-location` (M8) | Coordenadas del enlace        | Mensaje sin enlace, con aviso                                        | El de M8 |

## 5. Reglas de negocio

| #   | Regla                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- |
| R1  | El mensaje se compone con el mensaje base de ajustes (M6), el enlace de mapa y el porcentaje de batería (M9). |
| R2  | El total del mensaje no supera **160 caracteres**; se recorta el mensaje base y **nunca** el enlace.          |
| R3  | Se abre el redactor con **todos** los contactos de confianza como destinatarios.                              |
| R4  | Sin contactos, no se abre el redactor: se muestra un aviso.                                                   |
| R5  | Sin ubicación, el mensaje se compone sin enlace y se avisa de que falta.                                      |
| R6  | La app nunca envía: solo abre el redactor con `expo-sms`.                                                     |
| R7  | El tiempo se inyecta (`ahora: Date`) donde haga falta; el servicio es puro.                                   |

## 6. Datos y contrato con la API

- **Sin API en M10.** Todo es local.
- Se leen `Ajustes.mensajeBase` (M6), `ContactoConfianza[]` (M4), `Ubicacion` (M8) y el
  porcentaje de batería (M9). No se añaden campos.

## 7. Errores y fallo seguro

| Situación                  | Qué ve la persona                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| No hay contactos           | Aviso: «Agrega al menos un contacto de confianza para enviar el mensaje.» No se abre nada. |
| No hay ubicación           | Mensaje sin enlace + aviso: «No se pudo obtener la ubicación; el mensaje va sin mapa.»     |
| `expo-sms` no disponible   | Aviso y el mensaje queda visible para copiarlo a mano.                                     |
| Error al abrir el redactor | Aviso; la app no se cae.                                                                   |

## 8. Criterios de aceptación

1. Dado el estado `lista` con contactos y ubicación, el botón abre el redactor con todos los destinatarios y el mensaje compuesto.
2. Dado el estado `lista` sin contactos, no se abre el redactor y se muestra el aviso.
3. Dado el estado `lista` sin ubicación, el mensaje no lleva enlace y se avisa.
4. El mensaje resultante nunca supera 160 caracteres y conserva el enlace completo.
5. La app no envía el SMS por su cuenta en ningún caso.

## 9. Pruebas previstas

- Servicio puro: enlace de mapa, mensaje con y sin ubicación, recorte a 160 sin romper el enlace.
- Sensor: `abrirRedactor` recibe destinatarios y mensaje, y absorbe el fallo.
- Controlador: `mensaje` y `puedeAbrirRedactor` en `lista`; aviso sin contactos.
- Pantalla: vista previa, botón accesible, avisos y que **no** se llama a ningún envío.

## 10. Preguntas abiertas

| #   | Pregunta                                                                 | Propuesta                                                               | Respuesta de la persona |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------- |
| 1   | ¿Se abre el redactor automáticamente al llegar a `lista` o con un botón? | Con un botón explícito, para que la persona vea antes el mensaje.       | _pendiente_             |
| 2   | ¿Formato del enlace de mapa?                                             | `https://maps.google.com/?q=<lat>,<lng>` (abre en cualquier navegador). | _pendiente_             |
| 3   | ¿Destinatarios?                                                          | Todos los contactos de confianza a la vez; sin contactos no se abre.    | _pendiente_             |
| 4   | ¿Qué se recorta para respetar los 160 caracteres?                        | El mensaje base; el enlace y la línea de batería se conservan.          | _pendiente_             |

## 11. Decisiones y dependencias

- `expo-sms` ya está instalado (Expo SDK 58); no hay dependencias nuevas.
- El mensaje se compone en un servicio puro para poder probarlo sin hardware.
