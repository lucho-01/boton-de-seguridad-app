# ADR-0004 · Convenciones de código y puertas de calidad

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Quién decide:** el equipo (proyecto de curso)

## Contexto

Buena parte del código lo escribe un agente. Las reglas que solo viven en un documento se incumplen; las que el comando de verificación bloquea, no.

## Decisión

- `npm run check` = formato (Prettier) + lint (ESLint) + tipos (`tsc`) + pruebas (Jest). Es la definición de «terminado», también para el código de la IA.
- **ESLint** hace cumplir lo automatizable:
  - cero `any` y `unknown` (`no-explicit-any` y selectores de `no-restricted-syntax`);
  - prohibido el ternario y llaves obligatorias (`curly`);
  - máximo 100 líneas por función y 10 funciones por clase;
  - fronteras: las pantallas no importan `src/db`, `src/repositories` ni `src/api`; los servicios no importan hardware ni red;
  - prohibido `Date.now()`/`new Date()` en `src/services/` (el tiempo se inyecta).
- **Prettier** solo formatea.
- `snake_case` en el contrato con la API y en SQLite; identificadores en inglés, textos en español.
- Las pruebas se escriben desde la especificación y nunca se cambian para que pasen.

## Consecuencias

- Un agente no puede entregar si `npm run check` falla.
- Al añadir reglas nuevas automatizables, se agregan a `eslint.config.mjs` en el mismo cambio.
- Lo que el lint no detecta (contraste, gestos sin alternativa) lo cubren `security` y la revisión de la persona.
