# ADR-0007 · Copiar mensajes con expo-clipboard

- **Estado:** Aceptada
- **Fecha:** 2026-11-20
- **Contexto:** M11 requiere copiar el mensaje al portapapeles cuando el redactor SMS no está disponible.

## Decisión

Usar `expo-clipboard` con la versión compatible con el SDK de Expo del proyecto. La integración será un hook delgado en `src/sensors/`, y la pantalla mostrará confirmación o error al solicitar la copia.

## Alternativas descartadas

- Pedir a la persona que seleccione y copie manualmente el texto: es menos accesible y no cumple M11.
- Añadir una API propia de portapapeles: duplicaría una capacidad ya cubierta por Expo.

## Consecuencias

- Se añade una dependencia de ejecución de Expo.
- El portapapeles solo se modifica tras una acción explícita de la persona.
- El SMS nunca se envía en silencio.
