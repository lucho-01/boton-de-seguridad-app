# Lista de features de la app (FDD)

Una feature = **acción + resultado + objeto**, pequeña y con valor visible. Se construyen una por una y la persona aprueba la especificación **antes** de delegar. Aquí no hay reglas de negocio: se deciden al escribir cada spec. El alcance está en `docs/producto.md`.

| Id                         | Feature                                                                                                          | Quién       | Hito | Ola |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- | ---- | --- |
| **Base**                   |                                                                                                                  |             |      |     |
| M0                         | Base: Expo Router, Tabs, proveedor de sesión, tokens en `expo-secure-store`, cliente HTTP con refresh y `health` | Sistema     | 1    | 1   |
| M1                         | Registro e ingreso con la API (correo y contraseña)                                                              | Todos       | 3    | 3   |
| **Interfaz y gestos**      |                                                                                                                  |             |      |     |
| M2                         | Botón SOS con long press 3 s y anillo de progreso                                                                | Prestatario | 1    | 1   |
| M3                         | Cuenta regresiva de 5 s cancelable (pan o botón)                                                                 | Prestatario | 1    | 1   |
| M4                         | Contactos: listado, alta y edición con validación (máx. 5)                                                       | Prestatario | 1    | 1   |
| M5                         | Contactos con gestos: swipe para eliminar y doble toque para principal                                           | Prestatario | 1    | 1   |
| M6                         | Pantalla de ajustes: sensibilidad y mensaje base                                                                 | Prestatario | 1    | 1   |
| **Sensores**               |                                                                                                                  |             |      |     |
| M7                         | Sacudida triple con acelerómetro (opcional, con alternativa por botón)                                           | Prestatario | 1    | 1   |
| M8                         | Ubicación al terminar la cuenta (permiso explicado, alternativa sin ubicación)                                   | Prestatario | 3    | 3   |
| M9                         | Batería y vibración por segundo                                                                                  | Prestatario | 3    | 3   |
| **SMS e historial**        |                                                                                                                  |             |      |     |
| M10                        | Componer el mensaje (≤ 160 caracteres, enlace de mapa) y abrir el redactor                                       | Prestatario | 1    | 1   |
| M11                        | Sin SMS disponible: aviso y copiar el mensaje                                                                    | Prestatario | 4    | 4   |
| M12                        | Historial de alertas (enviadas y canceladas)                                                                     | Prestatario | 2    | 2   |
| **Datos y sincronización** |                                                                                                                  |             |      |     |
| M13                        | SQLite: modelo, migración y CRUD de contactos y alertas                                                          | Sistema     | 2    | 2   |
| M14                        | Sincronizar contactos y alertas con la API (offline-first, `pending` y `?since=`)                                | Sistema     | 3    | 3   |
| M15                        | Borrar mi cuenta desde la app                                                                                    | Prestatario | 3    | 3   |
| **Calidad y entrega**      |                                                                                                                  |             |      |     |
| M16                        | Accesibilidad completa y aviso permanente de la línea 123                                                        | Todos       | 4    | 4   |
| M17                        | Aviso de derechos, pruebas y APK con EAS Build                                                                   | Equipo      | 4    | 4   |

## Orden y dependencias

- **M0 primero:** sin navegación, sesión y cliente HTTP no se puede probar nada contra la API.
- M2 y M3 son el corazón de la app; M4 y M5 dependen de M13 para persistir.
- M10 depende de M4; M14 depende de M13 y M0.
- M1 depende de que la API tenga A1 construida.

## Áreas y carpetas

| Área            | Carpeta                                                                                          | Features                 |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------ |
| Vistas          | `app/`, `src/components/`                                                                        | M1–M5, M6, M11, M12, M16 |
| Datos y control | `src/db/`, `src/repositories/`, `src/services/`, `src/controllers/`, `src/sensors/`, `src/sync/` | M7–M10, M13, M14         |
| Cliente HTTP    | `src/api/`                                                                                       | M0, M1, M14, M15         |
