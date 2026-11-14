# ADR-0003 · Offline-first con SQLite y sincronización idempotente

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Quién decide:** el equipo (proyecto de curso)

## Contexto

La alerta debe funcionar aunque no haya red: es su razón de ser. A la vez, los contactos y el historial deben llegar a la API cuando haya conexión, sin duplicar al reintentar.

## Decisión

- Toda escritura va **primero a SQLite** y marca `pending = 1`.
- Cada tabla de dominio lleva `remote_id`, `updated_at`, `deleted` y `pending`.
- El `id` lo genera la app (UUID) y es el mismo en SQLite y Firestore.
- Un servicio de `src/sync/` envía los pendientes con `PUT /api/<recurso>/<id>` (idempotente) y luego pide `GET /api/<recurso>?since=<último updated_at>` hasta recibir menos de 500.
- Los borrados son lógicos (`deleted = 1` en local, `deleted_at` en la API).
- Conflictos: gana el último `updated_at` del servidor.

## Alternativas consideradas

- **Solo en línea:** rompe el caso de uso (persona sin cobertura o caminando).
- **IDs generados por el servidor:** obligan a esperar la red para crear un contacto.
- **Cola de operaciones (outbox) compleja:** innecesaria para dos tablas.

## Consecuencias

- La app es usable sin conexión; la sincronización es un proceso aparte y reintentable.
- Las pruebas del sync usan repositorios y clientes simulados, sin red.
- El historial local puede tener registros que aún no están en la API (`pending = 1`), y eso se muestra.
