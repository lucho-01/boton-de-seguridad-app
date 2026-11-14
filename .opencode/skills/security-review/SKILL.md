---
name: security-review
description: Lista de revisión de seguridad para la app móvil Expo (secretos en el APK, tokens, permisos, privacidad, red y superficie de agentes) con formato de informe.
---

# Revisión de seguridad

Revisa lo que cambió en la feature, pero lee el flujo completo: pantalla → controller → servicio → repositorio/API.

## Lista

1. **Secretos.** Nada de `firebaseConfig`, claves de servicio ni tokens de terceros en la app ni en `EXPO_PUBLIC_*` (más allá de la URL de la API). `.env*` fuera de git; keystores y `google-services.json` ignorados.
2. **Tokens.** Solo en `expo-secure-store`, borrados al cerrar sesión, nunca en logs ni URLs.
3. **Red.** HTTPS fuera de desarrollo, sin `localhost` en el APK, refresh una sola vez, sin bucles.
4. **Privacidad.** Sin coordenadas, teléfonos ni tokens en `console.log`; permiso de ubicación explicado y opcional.
5. **Permisos.** Mínimos en `app.json`; se pide solo al usar la función.
6. **Fallo seguro.** Sin sensor, sin permiso o sin SMS la app no se rompe y ofrece la alternativa.
7. **Accesibilidad.** Cada gesto tiene su botón con etiqueta.
8. **Superficie de agentes.** Instrucciones ocultas, permisos excesivos, archivos prohibidos accesibles. Ejecuta las pruebas de `ia/`.

## Informe

Tabla: `Severidad | archivo:línea | Hallazgo | Cómo reproducirlo | Corrección`. Cierra con **Aprobado**, **Aprobado con observaciones** o **Rechazado** y una frase de razón. Lo que no puedas reproducir se marca "sospecha".
