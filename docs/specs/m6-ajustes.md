# Spec M6 · Pantalla de ajustes: sensibilidad y mensaje base

- **Estado:** Aprobada
- **Feature:** M6 — Pantalla de ajustes: sensibilidad y mensaje base (`docs/features.md`)
- **Fecha:** 2026-11-19
- **Aprobada por:** la persona el 2026-11-19 (respuestas a las 4 preguntas abiertas)

## 1. Contexto y objetivo

Una persona que camina sola necesita ajustar la app a su forma de usarla: cuán sensible es la detección de sacudida para iniciar la cuenta de emergencia, y cuál es el mensaje base que se prepara en el SMS de alerta. Estos ajustes viven en la pestaña «Ajustes» y se conservan entre sesiones.

**Al terminar:** la pestaña «Ajustes» muestra el estado del servidor y de la sesión (ya existente), y añade dos bloques nuevos: sensibilidad de la sacudida (para M7) y mensaje base del SMS (para M10), ambos persistidos localmente.

## 2. Alcance

- **Incluye:**
  - Bloque de sensibilidad de la sacudida: umbral de aceleración y ventana de tiempo para detectar la sacudida triple (M7), con valores por defecto y posibilidad de ajustar.
  - Bloque de mensaje base del SMS: texto base que se usa en el redactor de emergencia (M10), con validación de ≤ 160 caracteres y aviso si se acorta (nunca se acorta el enlace de mapa).
  - Persistencia local de ambos ajustes (SQLite o SecureStore, decisión pendiente).
  - Pruebas: servicio puro de validaciones del mensaje, controlador con repositorio/SecureStore falso, render de pantalla.
- **No incluye:**
  - Detección de sacudida en sí: es M7.
  - Envío de SMS, composición con ubicación/batería, redactor: es M10.
  - Sincronización de ajustes con la API: no hay contrato de API para ajustes en esta fase (M14 sincroniza contactos y alertas).
  - Cambio de contraseña, gestión de sesión más allá de cerrar sesión: es M1.

## 3. Pantalla y gestos

Ruta `ajustes` (Expo Router), dentro de `PantallaConAviso` (el aviso de la línea 123 sigue visible).

| Elemento        | Detalle                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Título          | «Ajustes» (ya existe `TituloPantalla`)                                                                                                     |
| Estado servidor | `BloqueEstadoApi` (ya existe: estado del servidor y de la sesión)                                                                          |
| Sesión          | `BloqueSesion` (ya existe: email y cerrar sesión)                                                                                          |
| Sensibilidad    | Bloque nuevo: umbral de sacudida y ventana de tiempo, con controles para ajustar y botón para restablecer valores por defecto              |
| Mensaje base    | Bloque nuevo: campo de texto para el mensaje base del SMS, con contador de caracteres y validación ≤ 160 (sin acortar el enlace)           |
| Accesibilidad   | Cada control con `accessibilityRole` y `accessibilityLabel`; objetivos táctiles ≥ 44 × 44; el campo de texto anuncia errores de validación |

**M6 no introduce gestos complejos.** Todos los controles son botones y campos de texto estándar con alternativa accesible por definición.

## 4. Sensores y permisos

- Ninguno. M6 no usa sensores ni pide permisos. La sensibilidad de la sacudida se guarda para que M7 la use cuando se implemente la detección.
- M6 no solicita permiso de ubicación, SMS, batería ni acelerómetro.

## 5. Reglas de negocio

| #   | Regla                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | La sensibilidad de la sacudida tiene un umbral de aceleración de **15 m/s²** y una ventana de tiempo de **2000 ms** para detectar 3 sacudidas (M7 usará estos valores).                                    |
| R2  | El mensaje base del SMS tiene como máximo 160 caracteres; si se excede, se muestra error de validación y no se guarda.                                                                                     |
| R3  | El mensaje base por defecto es «Alerta de seguridad: necesito ayuda. Mi ubicación es [enlace de mapa].». El enlace de mapa del SMS nunca se acorta ni se elimina para cumplir el límite de 160 caracteres. |
| R4  | Los ajustes se persisten localmente y se mantienen al reiniciar la app.                                                                                                                                    |
| R5  | Existe una acción para restablecer los valores por defecto de sensibilidad y mensaje base.                                                                                                                 |
| R6  | Los cambios de ajustes se aplican inmediatamente a la sesión actual (no es necesario reiniciar la app).                                                                                                    |

_(R1 se completa con los valores por defecto de la pregunta abierta 1.)_

## 6. Datos y contrato con la API

- **Sin API en M6:** ningún endpoint de ajustes existe en el contrato actual (`docs/api-contrato.md`). Los ajustes se guardan solo localmente.
- Se usa SQLite con una tabla `ajustes` (`clave TEXT PRIMARY KEY, valor TEXT NOT NULL`), coherente con el offline-first de ADR-0003 y con M4/M5.
- **Sin dependencia cruzada:** M6 no modifica `docs/api-contrato.md` ni coordina con el repo `boton-de-seguridad-api`.

## 7. Errores y fallo seguro

| Situación                     | Qué ve la persona                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Mensaje base > 160 caracteres | «El mensaje base no puede superar los 160 caracteres.» junto al campo                     |
| Falla al guardar ajustes      | «No se pudieron guardar los ajustes. Intenta otra vez.»; los valores previos se mantienen |
| Sin sensor de sacudida        | M6 solo guarda la sensibilidad; M7 manejará la ausencia de sensor (§7 de M7)              |

## 8. Criterios de aceptación

1. Dado que abro «Ajustes», veo el bloque de sensibilidad con umbral y ventana de tiempo, y el bloque de mensaje base con campo de texto.
2. Dado que cambio el umbral de sacudida y guardo, el nuevo valor se aplica inmediatamente y persiste al reiniciar la app.
3. Dado que escribo un mensaje base de más de 160 caracteres, veo el error de validación y no se guarda.
4. Dado que restablezco los valores por defecto, la sensibilidad y el mensaje base vuelven a sus valores iniciales.
5. Dado un lector de pantalla, cada control de ajustes expone etiqueta y pista propias.
6. Dado que no hay red, guardar ajustes funciona igual (M6 no usa la red).

## 9. Pruebas previstas

- Servicio puro: validación de longitud del mensaje base (≤ 160, > 160, exactamente 160).
- Controlador con repositorio/SecureStore falso: guardar y leer ajustes, restablecer valores por defecto, error de escritura.
- Render de pantalla: bloques de sensibilidad y mensaje base, campo de texto con contador, botón de restablecer, errores de validación.

## 10. Preguntas abiertas

| #   | Pregunta                                                  | Propuesta                                                                            | Respuesta de la persona                                                          |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | ¿Valores por defecto de sensibilidad de la sacudida?      | Umbral: 15 m/s²; ventana: 2000 ms para 3 sacudidas (valores razonables para caminar) | **15 m/s² y 2000 ms**                                                            |
| 2   | ¿Dónde se persisten los ajustes (SQLite o SecureStore)?   | SQLite: tabla `ajustes` (clave/valor), coherente con el offline-first de ADR-0003    | **SQLite**                                                                       |
| 3   | ¿Mensaje base con valor por defecto?                      | «Alerta de seguridad: necesito ayuda. Mi ubicación es [enlace de mapa].»             | **Sí: «Alerta de seguridad: necesito ayuda. Mi ubicación es [enlace de mapa].»** |
| 4   | ¿El campo de mensaje base muestra contador de caracteres? | Sí: «XX / 160 caracteres» debajo del campo                                           | **Sí**                                                                           |

## 11. Decisiones y dependencias

- Depende de M4 (SQLite ya existe) o de `expo-secure-store` (ya instalado, M0).
- No hay dependencias nuevas de librerías.
- M7 (sacudida triple) usará la sensibilidad guardada en M6.
- M10 (SMS) usará el mensaje base guardado en M6.
