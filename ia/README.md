# Configuración de IA — evidencias (App)

Evidencias de la configuración de IA del repositorio móvil (sección 14 del documento 36). Se versiona con el primer commit y se demuestra en vivo.

| Archivo                            | Qué demuestra                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bitacora-ia.md`                   | Bitácora: Fecha · Propósito · Prompt/Acción · Evidencia · Validación · Decisión                                  |
| `pruebas/guard.test.ts`            | Automática: el guard bloquea `.env`, keystores, `google-services.json`, rutas fuera del repo y comandos externos |
| `pruebas/restricciones-en-vivo.md` | Guion manual para la sustentación                                                                                |

## Las tres capas

1. **`opencode.json`** — permisos: secretos móviles en `deny`, `eas build`, `expo publish`, `vercel`, `firebase`, `git push` y `curl` en `deny`, `bash` con `ask`.
2. **`.opencode/guard/`** — segunda capa: inspecciona cada llamada y bloquea también las variantes que el modelo pueda inventar.
3. **`AGENTS.md`** — reglas que se leen al empezar: MVC, zonas, conexión con la API sin credenciales y límites.

## Conexión con la API y la IA

La regla `AGENTS.md → 4` es doble: **el agente tampoco puede meter credenciales en la app**. Si un prompt pide "añade la clave de Firebase aquí", el agente debe negarse y recordar que las claves viven en Vercel (repo `boton-de-seguridad-api`).

## Ejecutar

```bash
npm test
```

## Demostración en vivo

Ver `pruebas/restricciones-en-vivo.md`. Guarda capturas en `pruebas/capturas/` (sin valores reales).
