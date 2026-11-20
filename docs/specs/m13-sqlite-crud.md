# Spec M13 — Persistencia SQLite para contactos y alertas

- **Estado:** Construida
- **Fecha:** 2026-11-20
- **Feature:** M13 — SQLite: modelo, migración y CRUD de contactos y alertas
- **Depende de:** M4 (contactos), M5 (contacto principal), M12 (historial)

## Alcance

- Mantener una única base SQLite y migraciones idempotentes para las tablas de
  dominio.
- Completar los repositorios locales de contactos y alertas con creación,
  lectura, actualización mediante guardado y borrado lógico.
- Consultas y escrituras parametrizadas; ningún dato del usuario se concatena
  al SQL.
- Las eliminaciones dejan `deleted = 1`, guardan `deleted_at` y marcan
  `pending = 1` para la sincronización futura.
- Marcar el contacto principal en una sola escritura atómica, actualizando
  `updated_at` y `pending` de los contactos afectados.
- Pruebas de repositorios y migración con base SQLite simulada.

## Fuera de alcance

- Sincronización con la API o resolución de conflictos (M14).
- Borrado físico de registros.
- Envío automático de SMS o acceso a Firebase desde la app.

## Criterios de aceptación

1. Contactos y alertas pueden listarse, consultarse por ID, guardarse o
   actualizarse y eliminarse lógicamente.
2. Los elementos borrados no aparecen en las lecturas normales y se conservan
   en SQLite para sincronización.
3. Las escrituras de borrado marcan `pending = 1` y actualizan las fechas
   sincronizables.
4. El cambio de contacto principal se realiza en un único `UPDATE`
   parametrizado y no desmarca a nadie si el ID no existe o está borrado.
5. La apertura reutiliza una sola instancia y ejecuta migraciones idempotentes.
6. La app continúa operando localmente sin API.
