# Spec <id> · <nombre de la feature>

- **Estado:** Borrador | Aprobada
- **Feature:** <id y nombre de `docs/features.md`>
- **Fecha:** <YYYY-MM-DD>
- **Aprobada por:** <persona> el <YYYY-MM-DD>

## 1. Contexto y objetivo

Qué problema resuelve y para quién. Una frase con acción + resultado + objeto.

## 2. Alcance

- **Incluye:** …
- **No incluye:** …

## 3. Pantalla y gestos

Ruta de Expo Router, elementos, estados y **el botón alternativo de cada gesto** con su `accessibilityLabel`.

## 4. Sensores y permisos

Capacidad, cuándo se pide el permiso, qué pasa si no está y cómo se degrada.

## 5. Reglas de negocio

Cada regla comprobable, con números y estados.

| #   | Regla |
| --- | ----- |
| R1  | …     |

## 6. Datos y contrato con la API

Tablas SQLite (con `remote_id`, `updated_at`, `deleted`, `pending`), campos y endpoints de `docs/api-contrato.md`. Si hace falta un cambio en la API, **dependencia cruzada**.

## 7. Errores y fallo seguro

Qué ve la persona cuando falla la red, el permiso, el sensor o el SMS.

## 8. Criterios de aceptación

1. Dado … cuando … entonces …

## 9. Pruebas previstas

Lógica pura, controlador con mocks de sensores, mensaje con y sin ubicación, cancelación sin redactor.

## 10. Preguntas abiertas

| #   | Pregunta | Propuesta | Respuesta de la persona |
| --- | -------- | --------- | ----------------------- |
| 1   | …        | …         | …                       |

## 11. Decisiones y dependencias

ADR nuevo si hace falta; ninguna dependencia sin justificación escrita.
