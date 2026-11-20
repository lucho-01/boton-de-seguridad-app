# Spec M14 — Sincronización offline-first

- **Estado:** Construida localmente; requiere actualización compatible de la API
- **Fecha:** 2026-11-20
- **Feature:** M14 — Sincronización de contactos y alertas
- **Depende de:** M0, M1, M4, M5, M12 y M13

## Alcance

- Mantener SQLite como fuente de lectura y escritura local.
- Sincronizar los registros pendientes de contactos y alertas al restaurar una
  sesión y cada vez que la app vuelve a primer plano.
- Mostrar el estado y permitir reintentar desde Ajustes.
- Vincular los datos locales a la primera cuenta que inicia una sincronización;
  impedir que otra cuenta sincronice esos datos en el mismo dispositivo.
- Intercambiar cambios mediante GET incremental, PUT idempotente y DELETE
  lógico, validando respuestas con Zod y usando el cliente autenticado existente.
- Guardar cursores y vínculo de cuenta en `ajustes`; no guardar tokens allí.
- Manejar paginación de hasta 500 elementos con orden `(updated_at, id)`,
  incluyendo filas con marcas temporales iguales.
- Aplicar tombstones remotos sin volverlos pendientes y tratar DELETE 404 como
  éxito idempotente.

## Fuera de alcance

- Implementación o despliegue del repositorio separado `boton-de-seguridad-api`.
- Cambio de cuenta, desvinculación o borrado de datos locales.
- Borrado físico, sincronización en segundo plano sin sesión o envío automático
  de SMS.

## Criterios de aceptación

1. Los registros locales pendientes se envían antes de descargar cambios remotos.
2. No se confirma un registro si su versión local cambió mientras la petición
   estaba en curso.
3. Las respuestas de API se validan y los cambios remotos no sustituyen una
   edición local pendiente más reciente.
4. Los cursores avanzan solo cuando finaliza la descarga; un error o una página
   repetida deja el cursor sin avanzar.
5. Se pagina por `(updated_at, id)` para no omitir registros con timestamps
   iguales en el límite de 500.
6. La sesión activa inicia la sincronización al restaurarse y al volver la app a
   primer plano; Ajustes presenta estado y reintento accesible.
7. El cierre de sesión espera a que termine una sincronización activa.
8. Una cuenta distinta no lee ni modifica los datos sincronizados en el
   dispositivo.

## Dependencia de contrato

La API debe aceptar y devolver `principal` para contactos y soportar
`after_id` en GET incremental, ordenando por `updated_at` e `id` ascendentes con
el predicado documentado en `docs/api-contrato.md`. La implementación móvil no
está completa en producción hasta que el repositorio de API implemente y valide
este contrato.
