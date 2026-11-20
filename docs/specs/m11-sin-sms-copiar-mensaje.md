# Spec M11 — Alternativa de copia cuando no hay SMS

- **Estado:** Aprobada
- **Fecha:** 2026-11-20
- **Feature:** M11 — Avisar si no hay SMS disponible y permitir copiar el mensaje
- **Depende de:** M10 (mensaje compuesto y detección de disponibilidad SMS)

## Alcance

- Si `expo-sms` no está disponible en el estado `lista`, mostrar un aviso y un botón accesible para copiar el mensaje completo.
- Confirmar cuando se copie; si falla el portapapeles, avisar sin bloquear la pantalla.
- Copiar únicamente después de una acción explícita de la persona.

## Fuera de alcance

- Enviar SMS, abrir otras aplicaciones o activar el portapapeles automáticamente.
- Copiar si el redactor SMS está disponible.

## Criterios de aceptación

1. Sin SMS disponible, aparece un aviso y el botón «Copiar mensaje».
2. Al pulsar, se copia exactamente el mensaje compuesto y se confirma el resultado.
3. Si falla la copia, se informa del error y el mensaje permanece visible para copiarlo manualmente.
4. Con SMS disponible, no se ofrece el botón de copia como alternativa.
