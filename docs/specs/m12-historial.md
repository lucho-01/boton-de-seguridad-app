# Spec M12 — Historial local de alertas

- **Estado:** Construida
- **Fecha:** 2026-11-20
- **Feature:** M12 — Mostrar alertas preparadas y canceladas en el historial
- **Depende de:** M8 (resultado de ubicación), M9 (batería), M10 (mensaje preparado)

## Alcance

- Registrar en SQLite cada alerta cancelada y cada flujo que llega a `lista` con
  su resultado de ubicación disponible.
- Mostrar el estado, fecha, disponibilidad de ubicación y batería en la pestaña
  «Historial».
- Cargar el historial al enfocar la pantalla y permitir reintentar si la
  consulta falla.
- Informar claramente si el almacenamiento local falla. Un mensaje preparado
  indica que se abrió o quedó listo para abrir el redactor; nunca que se envió.

## Fuera de alcance

- Sincronización con la API (M14).
- CRUD ampliado de alertas y contactos (M13).
- Mostrar o registrar números telefónicos, o enviar SMS automáticamente.

## Criterios de aceptación

1. Al cancelar el armado o la cuenta regresiva, se guarda una alerta `cancelada`.
2. Al llegar a `lista` y resolverse la ubicación, se guarda una sola alerta
   `mensaje_preparado`, con coordenadas y batería disponibles.
3. Si no se obtiene ubicación, se conserva la alerta y el historial indica que
   no hay ubicación disponible.
4. El historial distingue ambos estados y muestra los datos disponibles.
5. Si la consulta falla, la pantalla muestra un error y una acción accesible
   para reintentar.
6. La app nunca presenta el SMS como enviado ni lo envía en segundo plano.
