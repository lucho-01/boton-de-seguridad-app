# ADR-0001 · Arquitectura MVC con Expo Router y zonas por agente

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Quién decide:** el equipo (proyecto de curso)

## Contexto

La app se construye con varios agentes de IA y el documento del proyecto exige **arquitectura MVC**. Las pantallas no deben mezclar reglas, hardware, SQLite y red: eso impide probar y hace que un cambio rompa otra cosa.

## Decisión

- **View:** `app/` (Expo Router) y `src/components/`. Solo estado y callbacks.
- **Controller:** `src/controllers/` (hooks que unen servicios, sensores, repositorio y cliente de la API).
- **Model/Service:** `src/models/`, `src/repositories/`, `src/db/`, `src/services/` (reglas puras) y `src/api/` (cliente HTTP).
- **Sensores:** `src/sensors/` solo lee hardware; la lógica (3 sacudidas en 2 s) es una función pura testeable en `src/services/`.
- **Zonas de agentes** en subcarpetas: `screens`, `data`, `api`, `tests`, `security`.
- Las fronteras se vigilan con `no-restricted-imports` en `npm run lint`.

## Alternativas consideradas

- **Todo en `app/`:** rápido al empezar, imposible de probar y de repartir entre agentes.
- **Capas técnicas globales (`components/`, `hooks/`, `utils/`):** un cambio de una feature toca tres carpetas compartidas.

## Consecuencias

- Cada pieza es testeable por separado; los servicios, sin hardware ni red.
- Las pantallas no pueden usar `fetch` ni SQLite.
- Se paga algo de duplicación de tipos si una feature necesita datos de otra: se resuelve importando de `src/models`.
