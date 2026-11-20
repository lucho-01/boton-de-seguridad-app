# Spec M1 · Registro e ingreso con la API

- **Estado:** Aprobada
- **Feature:** M1 — Registro e ingreso con la API (correo y contraseña) (`docs/features.md`)
- **Fecha:** 2026-11-19
- **Aprobada por:** la persona el 2026-11-19 (respuestas a las 4 preguntas abiertas)

## 1. Contexto y objetivo

Una persona que quiere usar el botón de seguridad necesita crear una cuenta y entrar en la app. M1 permite registrarse (correo y contraseña) e ingresar, guardando la sesión de forma segura para usarla en todas las peticiones a la API.

**Al terminar:** la persona puede crear una cuenta, iniciar sesión, ver su estado de conexión y cerrar sesión desde la app.

## 2. Alcance

- **Incluye:**
  - Pantalla de registro: correo y contraseña, validación local (correo con formato, contraseña ≥ 8 caracteres), botón «Registrar», mensaje de error si el correo ya existe (409).
  - Pantalla de ingreso: correo y contraseña, botón «Ingresar», mensaje de error si las credenciales son inválidas (401 con el mismo mensaje exista o no el correo).
  - Guarda los tokens en `expo-secure-store` (nunca en `AsyncStorage`).
  - Al iniciar sesión o registrarse con éxito, navega a la pestaña «Alerta» (`(tabs)/index`).
  - Botón «Cerrar sesión» ya existe en «Ajustes» (M0/M6); funciona desde M1.
  - Aviso permanente de la línea 123 (RF-06) visible en todas las pantallas.
  - Pruebas: servicio puro de validación, controlador con cliente HTTP simulado, render de pantallas.
- **No incluye:**
  - Recuperación de contraseña (olvidé mi contraseña).
  - Cambio de contraseña.
  - Inicio de sesión con redes sociales o proveedores externos.
  - Verificación de correo electrónico.
  - Sincronización de contactos o alertas: es M14.
  - Registro e ingreso requieren que la API tenga el hito A1 construido y desplegado.

## 3. Pantalla y gestos

Rutas `app/registro.tsx` y `app/login.tsx` (Expo Router), dentro de la pila de `app/_layout.tsx` (fuera de las pestañas, ya que requieren autenticación).

| Elemento           | Detalle                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| Título             | «Crear cuenta» (registro) / «Ingresar» (ingreso)                         |
| Campo correo       | Texto, tipo email, requerido                                             |
| Campo contraseña   | Texto, tipo contraseña (oculto), requerido, ≥ 8 caracteres               |
| Botón principal    | «Registrar» / «Ingresar», `accessibilityRole="button"`, objetivo ≥ 44×44 |
| Enlace alternativo | «¿Ya tienes cuenta? Ingresar» / «¿No tienes cuenta? Regístrate»          |
| Mensaje de error   | Debajo del campo correspondiente, texto en español, no solo por color    |
| Aviso 123          | Siempre visible (RF-06), vía `PantallaConAviso`                          |

**Gesto = acción + alternativa accesible:** cada botón tiene `accessibilityRole="button"` y `accessibilityLabel`; no hay gestos complejos en M1.

## 4. Sensores y permisos

- Ninguno. M1 no usa sensores ni pide permisos del dispositivo.

## 5. Reglas de negocio

| #   | Regla                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------ |
| R1  | El correo debe tener formato válido (contiene `@` y dominio).                                                |
| R2  | La contraseña debe tener al menos 8 caracteres (contrato con la API).                                        |
| R3  | Ambos campos son obligatorios antes de habilitar el botón principal.                                         |
| R4  | Al registrar con éxito, se guardan los tokens en `expo-secure-store` y se navega a la pestaña «Alerta».      |
| R5  | Al iniciar sesión con éxito, se guardan los tokens en `expo-secure-store` y se navega a la pestaña «Alerta». |
| R6  | El correo repetido (409) se muestra como error en el campo correo: «Ese correo ya está registrado».          |
| R7  | Las credenciales inválidas (401) se muestran como error genérico: «Correo o contraseña incorrectos».         |
| R8  | Los tokens nunca se registran en `console.log` ni se envían a terceros.                                      |
| R9  | Sin red, el botón está deshabilitado o se muestra error de conexión.                                         |

## 6. Datos y contrato con la API

- **Endpoints existentes** (ya implementados en `src/api/auth.ts`):
  - `POST /api/auth/registro` → `{ token, refreshToken, expiraEnSeg, usuario: { id, email } }`
  - `POST /api/auth/login` → `{ token, refreshToken, expiraEnSeg, usuario: { id, email } }`
  - `GET /api/auth/yo` → `{ usuario: { id, email } }` (restaura sesión)
- **Esquemas Zod** ya existen en `src/api/contracts/index.ts`: `RespuestaAuthSchema`, `UsuarioSchema`, `ErrorApiSchema`, `DetalleErrorSchema`.
- Los campos viajan en `camelCase` en la respuesta de auth (según el contrato); el cliente los mapea a `snake_case` internamente.
- Los errores de la API tienen forma `{ error, detalles? }`; `detalles` se usa para marcar campos del formulario.

## 7. Errores y fallo seguro

| Situación                       | Qué ve la persona                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Correo vacío o inválido         | «Escribe un correo válido.» junto al campo correo                                    |
| Contraseña menor a 8 caracteres | «La contraseña debe tener al menos 8 caracteres.» junto al campo contraseña          |
| Correo ya registrado (409)      | «Ese correo ya está registrado.» junto al campo correo                               |
| Credenciales inválidas (401)    | «Correo o contraseña incorrectos.» (mensaje genérico, no revela si el correo existe) |
| Sin red                         | «No hay conexión a internet. Intenta de nuevo.»                                      |
| Error del servidor (500)        | «Error interno. Intenta de nuevo.»                                                   |

## 8. Criterios de aceptación

1. Dado que abro «Registro», veo campos de correo y contraseña, y el botón «Registrar» deshabilitado hasta que ambos estén válidos.
2. Dado que escribo un correo válido y una contraseña de 8+ caracteres, y pulso «Registrar», se crea la cuenta y navego a la pestaña «Alerta».
3. Dado que escribo un correo ya registrado, veo «Ese correo ya está registrado.» y no se crea la cuenta.
4. Dado que abro «Ingresar», escribo correo y contraseña válidos, y pulso «Ingresar», ingreso y navego a la pestaña «Alerta».
5. Dado que escribo credenciales inválidas, veo «Correo o contraseña incorrectos.» y no ingreso.
6. Dado que no hay red, al intentar registrar o ingresar, veo «No hay conexión a internet. Intenta de nuevo.».
7. Dado que leo con un lector de pantalla, el botón «Registrar» / «Ingresar» tiene `accessibilityRole="button"` y una etiqueta descriptiva.

## 9. Pruebas previstas

- Servicio puro: validación de correo y contraseña (vacíos, formato inválido, contraseña corta).
- Controlador con cliente HTTP simulado: registro exitoso, login exitoso, correo repetido (409), credenciales inválidas (401), sin red.
- Render de pantallas: campos vacíos, botón deshabilitado hasta validar, errores mostrados, navegación tras éxito.

## 10. Preguntas abiertas

| #   | Pregunta                                                                                               | Propuesta                                    | Respuesta de la persona |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ----------------------- |
| 1   | ¿Una sola pantalla con pestañas (registro/ingreso) o dos pantallas separadas (`/registro` y `/login`)? | Dos pantallas separadas: más simple y clara. | _pendiente_             |
| 2   | ¿Después de iniciar sesión o registrarse, a dónde navega?                                              | A la pestaña «Alerta» (`(tabs)/index`).      | _pendiente_             |
| 3   | ¿El botón «Registrar» / «Ingresar» se deshabilita mientras se envía la petición?                       | Sí, para evitar envíos duplicados.           | _pendiente_             |
| 4   | ¿El enlace «¿Ya tienes cuenta? Ingresar» navega a `/login` y viceversa?                                | Sí, navegación entre pantallas.              | _pendiente_             |

## 11. Decisiones y dependencias

- Depende de que la API tenga el hito A1 construido y desplegado (endpoint `/api/auth/registro`, `/api/auth/login`, `/api/auth/yo`).
- No hay dependencias nuevas de librerías: `expo-secure-store` y el cliente HTTP ya existen (M0).
- Los tipos `Usuario`, `Sesion`, `Credenciales` ya existen en `src/models/index.ts` y `src/api/auth.ts`.
- Los esquemas Zod ya existen en `src/api/contracts/index.ts`.
