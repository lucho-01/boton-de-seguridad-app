# ADR-0005 · Configuración de agentes de IA (OpenCode + guard)

- **Estado:** Aceptada
- **Fecha:** 2026-11-14
- **Quién decide:** el equipo (proyecto de curso)

## Contexto

El documento 36 exige una configuración de IA propia, versionada en el primer commit y demostrable en vivo: la IA no lee secretos, no sale de la carpeta y las acciones externas piden permiso. En una app móvil los secretos incluyen, además de `.env`, **keystores, `google-services.json` y credenciales de EAS**.

## Decisión

- **Un único harness:** OpenCode.
- **Tres capas de restricción:**
  1. `opencode.json`: secretos en `deny` (incluye `*.keystore`, `*.jks`, `*.p12`, `google-services.json`, `GoogleService-Info.plist`, `credentials.json`), `.env.example` legible, `bash` con `ask` por defecto y `deny` para `git push`, `eas build`/`submit`, `expo publish`, `vercel`, `firebase`, `curl` y volcados de entorno.
  2. Guard en `.opencode/guard/rules.ts` + `.opencode/plugins/guard.ts`: inspecciona cada llamada y bloquea rutas fuera del repo y comandos peligrosos aunque el modelo los formule de otra manera.
  3. `AGENTS.md`: reglas del proyecto (stack, zonas, seguridad, alcance) y `docs/api-contrato.md` como contrato con el otro repositorio.
- **Evidencia en `ia/`:** bitácora, pruebas automáticas (`npm test`) y guion de demostración en vivo con capturas.

## Alternativas consideradas

- **Solo `opencode.json`:** los patrones de permisos no cubren todas las formas de una ruta.
- **Solo instrucciones en `AGENTS.md`:** son una petición, no una barrera.
- **Sandbox del sistema operativo:** fuera del alcance del curso.

## Consecuencias

- El APK nunca se construye desde el agente: `eas build` requiere que la persona lo autorice o lo ejecute.
- El guard comparte diseño con el del repo de la API, pero tiene sus propias reglas para secretos móviles; se mantienen por separado a propósito.
- Las pruebas de `ia/` deben seguir en verde en cada entrega.
