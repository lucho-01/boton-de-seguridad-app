---
name: write-spec
description: Convierte una feature de docs/features.md en una especificación verificable en docs/specs/, preguntando a la persona cada decisión pendiente. Úsala antes de implementar cualquier feature (SDD).
---

# Escribir una especificación (SDD)

Una especificación es el contrato entre la persona y los agentes: lo que NO está escrito, los agentes lo inventan.

**Regla de oro:** nunca decidas por la persona una regla de negocio (límites, textos, permisos, umbrales, quién puede qué). Si la persona no lo ha dicho, es una pregunta. Puedes proponer una opción, pero la decisión es suya.

## Pasos

1. Lee la feature en `docs/features.md`, `docs/producto.md`, `docs/arquitectura.md`, `docs/api-contrato.md`, `src/models/` y las specs aprobadas en `docs/specs/`.
2. Copia `docs/specs/_template.md` a `docs/specs/<id>-<nombre-en-kebab>.md` y escribe el borrador con lo que sí se deduce. Lo que no se deduce va a **Preguntas abiertas**, numeradas.
3. **Pregunta a la persona antes de dar la spec por buena.** Usa la herramienta de preguntas del harness, en grupos de máximo 4. Cada pregunta lleva tu propuesta y por qué; espera la respuesta y anótala en la spec.
4. Completa cada sección con reglas **comprobables** (un número, un estado, un error concreto).
5. Cada regla debe tener al menos un criterio de aceptación Dado/Cuando/Entonces. Si toca la API, indicarlo como dependencia cruzada.
6. Marca el estado `Borrador`. Solo la persona lo cambia a `Aprobada`: pídeselo al final y no delegues nada antes.

## Revisión rápida antes de entregar

- ¿Quedó alguna pregunta abierta sin respuesta de la persona?
- ¿Un agente de pruebas podría escribir las pruebas leyendo solo este archivo?
- ¿Está dicho quién SÍ y quién NO puede hacer la operación?
- ¿Están los bordes (0, 1, límite, límite + 1, vacío, sin conexión, sin permiso, sin sensor, token vencido)?
- ¿Cada gesto tiene su alternativa accesible?
