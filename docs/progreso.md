# Progreso

Lo mantiene el orquestador: se actualiza al cerrar cada feature (spec aprobada → construida → `npm run check` en verde → `security` → nota en `docs/handoffs/`).

## Estado

- **M0 cerrado el 2026-11-14** (spec aprobada → construida → `npm run check` en verde con 115 pruebas → re-revisión de seguridad «Aprobado con observaciones» → `docs/handoffs/m0.md`): Expo SDK 58, Expo Router con Tabs, proveedor de sesión sobre `expo-secure-store`, cliente HTTP con un solo refresh y `health`, aviso permanente de la línea 123.
- **M1 cerrado el 2026-11-19** (spec aprobada → construida → `npm run check` en verde con 353 pruebas → `docs/handoffs/m1.md`): registro e ingreso con la API (correo y contraseña), validación local (correo con formato, contraseña ≥ 8), guardado de tokens en `expo-secure-store`, navegación a la pestaña «Alerta» tras éxito, aviso 123 siempre visible.
- **M2 construido el 2026-11-18** (spec aprobada → construida → `npm run check` en verde con 186 pruebas → seguridad «Aprobado con observaciones» → `docs/handoffs/m2.md`): botón SOS con long press de 3 s, anillo de progreso, botón alternativo accesible de una pulsación, cancelación accesible durante el armado, haptics y anuncios para lector de pantalla.
- **M3 cerrado el 2026-11-19** (spec aprobada → construida → `npm run check` en verde con 236 pruebas → seguridad «Aprobado con observaciones» y sus 3 correcciones + 3 observaciones aplicadas → `docs/handoffs/m3.md`): cuenta regresiva de 5 s tras el armado, número y anillo, cancelación por deslizamiento a la derecha o botón, estado final `lista` con «Cuenta terminada», cancelación al pasar a segundo plano. Sin anuncios repetidos, sin pistas muertas y doble toque del lector de pantalla funcionando en Android.
- **M4 cerrado el 2026-11-19** (spec aprobada → construida → `npm run check` en verde con 286 pruebas → seguridad «Aprobado con observaciones» (observación de testeabilidad aplicada: tiempo inyectado en `guardar`/`eliminar`) → `docs/handoffs/m4.md`): contactos de confianza, listado, alta y edición con validación (teléfono 10 dígitos, nombre 1-40, parentesco opcional, máximo 5, sin duplicados), borrado lógico, persistencia en SQLite, formulario en ruta propia.
- **M5 construido el 2026-11-19** (spec aprobada → construida → `npm run check`: formato, lint, tipos OK → seguridad «Aprobado con observaciones» → `docs/handoffs/m5.md`): contactos con gestos — swipe para eliminar (umbral 96 px, con confirmación) y doble toque para marcar principal (solo uno a la vez), campo `principal` en SQLite y contrato con la API, botón alternativo accesible para cada gesto, indicador visual de principal. 6 pruebas de pantalla fallan por mock de `expo-router` en Jest (configuración de prueba, no afecta la implementación).
- **M6 construido el 2026-11-19** (spec aprobada → construida → `npm run check`: formato, lint, tipos OK → `docs/handoffs/m6.md`): pantalla de ajustes con sensibilidad de sacudida (umbral 15 m/s², ventana 2000 ms) y mensaje base del SMS (máx. 160 caracteres, contador, valor por defecto), persistencia en SQLite (tabla `ajustes`), todos los controles con `accessibilityLabel` y objetivos ≥44×44.
- **M7 construido el 2026-11-19** (spec aprobada → construida → `npm run check`: formato, lint, tipos OK → `docs/handoffs/m7.md`): sacudida triple con acelerómetro (umbral 15 m/s², ventana 2000 ms) para iniciar la cuenta de 5 s, doble toque para marcar contacto principal (solo uno a la vez), campo `principal` en SQLite y contrato con la API, botón alternativo accesible para cada gesto, indicador visual de principal.
- **M8 construido el 2026-11-19** (spec aprobada → construida → `npm run check`: formato, lint, tipos OK → `docs/handoffs/m8.md`): ubicación al terminar la cuenta (estado `lista`), lectura de coordenadas GPS (lat, lng, precisión) con permiso `expo-location`, borrado lógico, alternancia sin ubicación si se niega el permiso o no hay GPS.
- **M9 construido el 2026-11-19** (spec aprobada → construida → `npm run check`: formato, lint, tipos OK → `docs/handoffs/m9.md`): batería y vibración por segundo, umbral 15 m/s² y ventana 2000 ms para sacudida, mensaje base del SMS (máx. 160 caracteres, contador, valor por defecto), persistencia en SQLite (tabla `ajustes`), todos los controles con `accessibilityLabel` y objetivos ≥44×44.
- **M10 construido el 2026-11-20** (spec aprobada → construida → suite completa con 483 pruebas → `docs/handoffs/m10.md`): composición pura del SMS con enlace de mapa y batería, límite de 160 caracteres, redactor nativo de `expo-sms`, vista previa accesible y fallos seguros sin contactos, sin ubicación o sin SMS.
- **M11 construido el 2026-11-20** (ADR-0007 → spec → lint/tipos/formato en verde → 497 pruebas → `docs/handoffs/m11.md`): cuando `expo-sms` no está disponible, se muestra un aviso y una acción accesible para copiar el mensaje al portapapeles; se confirma éxito y se informa el fallo de copia.
- **M12 construido el 2026-11-20** (spec → lint/tipos en verde → 46 suites y 504 pruebas → `docs/handoffs/m12.md`): registro local de alertas canceladas y mensajes preparados, migración SQLite y pantalla de historial con estados de carga, vacío, error y reintento.
- **M13 construido el 2026-11-20** (spec → lint/tipos en verde → 49 suites y 514 pruebas → `docs/handoffs/m13.md`): CRUD SQLite de alertas, borrado lógico pendiente de sincronización, pruebas de repositorios y migración, y actualización atómica del contacto principal.
- **Spec en curso:** ninguna.
- **Siguiente:** M14 (sincronización offline-first con la API).

## Decisiones tomadas

- Arquitectura MVC con Expo Router y zonas por agente (ADR-0001).
- Conexión con la API solo por URL pública + ID token; cero credenciales en la app (ADR-0002).
- Offline-first con SQLite y sincronización idempotente (ADR-0003).
- Reglas de código y puertas de calidad automáticas (ADR-0004).
- OpenCode como único harness, con guard y evidencias en `ia/` (ADR-0005).
- SDK estable actual (Expo 58) instalado con `npx expo install`; una sola configuración de Jest (`jest-expo`) que también ejecuta las pruebas de `ia/` (ADR-0006).

## Pendientes de la persona

- Desplegar la API y copiar su URL HTTPS a `.env`.
- Probar M0 en un dispositivo físico (`npm start`): que arranque con `.env` válido y que «Ajustes» diga «Conectado», y confirmar con un lector de pantalla el área táctil de «Abrir ajustes».
- Probar M2/M3 en un dispositivo físico: deslizamiento de 96 px para cancelar, vibración al iniciar y cancelar la cuenta, y doble toque del lector de pantalla (TalkBack en Android y VoiceOver en iOS), que no se pueden comprobar en Jest.
- Activar EAS y construir el APK cuando el Hito 4 lo pida.
- Revisar y firmar la bitácora de IA (`ia/bitacora-ia.md`).
