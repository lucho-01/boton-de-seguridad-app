# Progreso

Lo mantiene el orquestador: se actualiza al cerrar cada feature (spec aprobada → construida → `npm run check` en verde → `security` → nota en `docs/handoffs/`).

## Estado

- **Construido:** configuración de IA (OpenCode, guard, agentes, skills, puertas de calidad) y documentación del proyecto, incluida la conexión con la API.
- **Spec en curso:** ninguna.
- **Siguiente:** M0 (base: Expo Router, sesión con `expo-secure-store`, cliente HTTP con refresh y `health`), ver `docs/features.md`.

## Decisiones tomadas

- Arquitectura MVC con Expo Router y zonas por agente (ADR-0001).
- Conexión con la API solo por URL pública + ID token; cero credenciales en la app (ADR-0002).
- Offline-first con SQLite y sincronización idempotente (ADR-0003).
- Reglas de código y puertas de calidad automáticas (ADR-0004).
- OpenCode como único harness, con guard y evidencias en `ia/` (ADR-0005).

## Pendientes de la persona

- Desplegar la API y copiar su URL HTTPS a `.env`.
- Activar EAS y construir el APK cuando el Hito 4 lo pida.
- Aprobar la especificación de M0 antes de implementar.
- Revisar y firmar la bitácora de IA (`ia/bitacora-ia.md`).
