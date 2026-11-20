# ADR-0008 · Iconos SVG para el rediseño visual

- **Estado:** Aceptada
- **Fecha:** 2026-11-20
- **Decisor:** persona solicitante del rediseño visual

## Contexto

El diseño de referencia solicita iconos SVG consistentes y prohíbe emojis. La
app React Native no tiene una dependencia de iconos ni soporte SVG instalado.

## Decisión

- Añadir `react-native-svg` mediante `npx expo install`, usando la versión
  compatible con el SDK de Expo actual.
- Dibujar el conjunto pequeño de iconos de navegación y acciones como
  componentes SVG locales, con color y tamaño configurables.
- No añadir una biblioteca de iconos, fuentes ni dependencias web: no son
  necesarias para la interfaz nativa.

## Consecuencias

- `react-native-svg` se incorpora como dependencia de ejecución compatible con
  Android e iOS.
- Los iconos comparten trazos, dimensiones y etiquetas accesibles definidas en
  la app; no se usan emojis en la navegación ni en las tarjetas rediseñadas.
