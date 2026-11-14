---
name: feature-workflow
description: Flujo del orquestador para construir una feature de la app móvil con varios agentes (especificar, contrato, dividir por zonas, delegar, integrar, revisar, registrar).
---

# Flujo de una feature de la app

1. **Elegir** la feature en `docs/features.md` (FDD: una acción pequeña con resultado visible).
2. **Especificar** con `write-spec`. Sin especificación aprobada por la persona no se delega.
3. **Contrato:** revisar `src/models/` y `src/api/contracts/` contra `docs/api-contrato.md`. Si la feature necesita un cambio en la API, se anota como **dependencia cruzada** y se coordina con el repo `boton-de-seguridad-api`.
4. **Dividir por zonas** (nadie edita fuera de su zona):

   | Agente      | Zona                                                                                                         |
   | ----------- | ------------------------------------------------------------------------------------------------------------ |
   | screens     | `app/**`, `src/components/**`                                                                                |
   | data        | `src/db/**`, `src/repositories/**`, `src/services/**`, `src/controllers/**`, `src/sensors/**`, `src/sync/**` |
   | api         | `src/api/**` (sin `contracts/`)                                                                              |
   | tests       | `ia/**`, `__tests__/**`, `src/**/__tests__/**`                                                               |
   | security    | solo lectura                                                                                                 |
   | orquestador | `docs/**`, `AGENTS.md`, `opencode.json`, `src/models/**`, `src/api/contracts/**`                             |

5. **Delegar** con: ruta de la especificación, zona, criterio de terminado y comando de verificación. Recuerda las reglas de `AGENTS.md` (gestos con alternativa, cero `any`/`unknown`, sin ternarios, `snake_case`, sin credenciales) y las de conexión (token en `expo-secure-store`, un solo refresh ante 401, Zod en la frontera).
6. **Orden recomendado:** data → api → screens → integrar → security. `screens` y `tests` pueden avanzar a la vez si el contrato está fijo.
7. **Integrar:** `npm run check`.
8. **Revisar:** pide el informe a `security`; corrige con el agente dueño de la zona hasta "Aprobado".
9. **Registrar:** nota en `docs/handoffs/<feature>.md`; actualiza `docs/progreso.md`; ADR si hubo decisión de arquitectura.
