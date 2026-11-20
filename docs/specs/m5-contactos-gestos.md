# Spec M5 · Contactos con gestos: swipe para eliminar y doble toque para principal

- **Estado:** Aprobada
- **Feature:** M5 — Contactos con gestos: swipe para eliminar y doble toque para principal (`docs/features.md`)
- **Fecha:** 2026-11-19
- **Aprobada por:** la persona el 2026-11-19 (respuestas a las 4 preguntas abiertas)

## 1. Contexto y objetivo

Una persona que camina sola necesita gestionar sus contactos de confianza rápidamente: eliminar uno que ya no usa o marcar cuál es el más importante, sin navegar por botones pequeños. Los gestos permiten hacerlo con una sola mano, y cada gesto tiene su botón alternativo accesible.

**Al terminar:** la pestaña «Contactos» permite deslizar una fila hacia la izquierda para eliminar (con confirmación) y dar doble toque a un contacto para marcarlo como el principal (solo uno a la vez).

## 2. Alcance

- **Incluye:**
  - Gesto de deslizar hacia la izquierda en una fila para eliminar (umbral configurable, spec R4), con confirmación antes de borrar.
  - Gesto de doble toque en un contacto para marcarlo como principal (spec R2), con exclusividad: solo uno puede ser principal a la vez.
  - Campo `principal` (booleano) en el modelo de contacto, en SQLite y en el contrato con la API (`contactos`) — dependencia cruzada con el repo `boton-de-seguridad-api`.
  - Botón alternativo accesible para cada gesto (eliminar y marcar principal), con `accessibilityRole="button"` y `accessibilityLabel`.
  - Indicador visual en la fila del contacto principal.
  - Validación: no se puede desmarcar el único principal si es el único contacto (spec R3).
  - Pruebas: servicio puro, controlador con doble de repositorio, render de pantalla con gestos simulados.
- **No incluye:**
  - Sincronización de pendientes con la API: es M14. M5 escribe con `pending = 1` y el campo `principal` viaja en el documento local; la sincronización real es M14.
  - SMS, mensaje, ubicación: es M10.
  - Historial de alertas: es M12.

## 3. Pantalla y gestos

Ruta `(tabs)/contactos`, dentro de `PantallaConAviso`.

| Elemento          | Detalle                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Fila de contacto  | Nombre, teléfono, parentesco; indicador visual «Principal» si aplica                                                              |
| Gesto swipe       | Deslizar la fila hacia la izquierda con umbral de **96 px** (igual que M3) para pedir eliminación; si no supera el umbral, vuelve |
| Gesto doble toque | Doble toque sobre cualquier parte de la fila marca/desmarca como principal (toggle con exclusividad)                              |
| Botón eliminar    | «Eliminar» por fila, con `accessibilityLabel="Eliminar contacto"`; alternativa accesible al swipe                                 |
| Botón principal   | «Marcar como principal» por fila, con `accessibilityLabel="Marcar como principal"`; alternativa accesible al doble toque          |
| Confirmación      | Al completar el swipe: «¿Eliminar el contacto "X"?» con «Cancelar» y «Eliminar»                                                   |
| Estado vacío      | Igual que M4: «Todavía no tienes contactos de confianza.» + «Añadir contacto»                                                     |

**Regla de gesto = acción + alternativa accesible:** cada gesto tiene su botón equivalente para lectores de pantalla (AGENTS.md §8.1).

## 4. Sensores y permisos

- Ninguno. M5 no usa sensores ni pide permisos.

## 5. Reglas de negocio

| #   | Regla                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | El deslizamiento hacia la izquierda con umbral ≥ 96 px pide eliminar el contacto (mismo umbral que M3).                                            |
| R2  | El doble toque en una fila marca el contacto como principal; si ya es principal, lo desmarca (toggle).                                             |
| R3  | Solo un contacto puede ser principal a la vez: al marcar uno nuevo, el anterior deja de serlo (exclusividad).                                      |
| R4  | El umbral de swipe es 96 px; deslizar menos y soltar no elimina y la fila vuelve a su sitio.                                                       |
| R5  | Eliminar por swipe pide confirmación («¿Eliminar el contacto "X"?»); cancelar deja el contacto intacto.                                            |
| R6  | El botón «Eliminar» por fila hace lo mismo que el swipe (borrado lógico con `deleted = 1`, `pending = 1`).                                         |
| R7  | El botón «Marcar como principal» por fila hace lo mismo que el doble toque.                                                                        |
| R8  | Si hay un solo contacto y es principal, no se puede desmarcar (hay que mantener al menos uno principal si existe algún contacto).                  |
| R9  | Cada escritura (marcar principal, eliminar) guarda con `pending = 1` para sincronización posterior (M14).                                          |
| R10 | La lista se ordena por nombre, sin distinguir mayúsculas (igual que M4); los principales no se ordenan primero a menos que se decida lo contrario. |

## 6. Datos y contrato con la API

Tabla SQLite `contacto_confianza` (ya creada en M4), se añade la columna:

```sql
ALTER TABLE contacto_confianza ADD COLUMN principal INTEGER NOT NULL DEFAULT 0;
```

- `principal` es 0 o 1 (booleano en SQLite). Solo uno puede ser 1 a la vez (R3).
- El modelo `ContactoConfianza` de `src/models/index.ts` se extiende con `principal: number` (0/1).
- **Dependencia cruzada:** el contrato con la API (`docs/api-contrato.md`, recurso `contactos`) debe añadir el campo `principal` (0/1) para que M14 sincronice. Este cambio se coordina con el repo `boton-de-seguridad-api`.
- M5 no llama a la API: solo escribe localmente con `pending = 1`.

## 7. Errores y fallo seguro

| Situación                | Qué ve la persona                                                                 |
| ------------------------ | --------------------------------------------------------------------------------- |
| Swipe sin superar umbral | La fila vuelve a su sitio; no pasa nada                                           |
| Doble toque en principal | Se desmarca (toggle), a menos que sea el único contacto y el único principal (R8) |
| Falla la escritura local | «No se pudo guardar el contacto. Intenta otra vez.»                               |
| Sin red                  | Todo funciona igual; la sincronización es M14                                     |

## 8. Criterios de aceptación

1. Dado una fila de contacto, cuando deslizo hacia la izquierda 96 px o más, entonces aparece la confirmación de eliminación.
2. Dado una fila de contacto, cuando deslizo menos de 96 px y suelto, entonces la fila vuelve a su sitio y no se elimina.
3. Dado una fila de contacto, cuando doy doble toque, entonces se marca como principal y aparece el indicador «Principal».
4. Dado dos contactos, cuando marco el segundo como principal, entonces el primero deja de serlo (exclusividad).
5. Dado un solo contacto principal, cuando intento desmarcarlo, entonces no se desmarca (R8).
6. Dado un contacto principal, cuando pulso «Marcar como principal» por segunda vez, entonces se desmarca.
7. Dado la confirmación de eliminación, cuando pulso «Cancelar», entonces el contacto sigue en la lista.
8. Dado un lector de pantalla, cuando recorro la lista, entonces cada fila expone botón «Eliminar» y botón «Marcar como principal» con etiqueta propia.
9. Dado que no hay red, cuando elimino o marco principal, entonces todo funciona igual (M5 no usa la red).

## 9. Pruebas previstas

- Servicio puro: marcar principal con exclusividad, toggle, único principal no se desmarca, orden por nombre.
- Controlador con doble de repositorio: swipe elimina con confirmación, doble toque marca principal, exclusividad, error de escritura.
- Render de pantalla: gestos simulados (swipe 95 px no elimina, 96 px elimina; doble toque marca), botones alternativos accesibles, indicador principal.

## 10. Preguntas abiertas

Resueltas por la persona el 2026-11-19.

| #   | Pregunta                                                                              | Propuesta                                                                              | Respuesta de la persona |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| 1   | ¿Cómo se activan los gestos de M5?                                                    | Siempre activos, con botón equivalente para accesibilidad                              | **Siempre activos**     |
| 2   | ¿Varios contactos principales o solo uno?                                             | Solo uno (exclusividad)                                                                | **Solo uno principal**  |
| 3   | ¿El swipe para eliminar pide confirmación?                                            | Sí: «¿Eliminar el contacto "X"?» con Cancelar y Eliminar                               | **Con confirmación**    |
| 4   | ¿El campo `principal` se guarda en SQLite y en el contrato con la API ahora o en M14? | Ahora en M5: columna en SQLite y campo en el contrato con la API (dependencia cruzada) | **Ahora en M5**         |

## 11. Decisiones y dependencias

- Depende de M4 (contactos ya existen con listado, alta, edición, borrado lógico).
- **Dependencia cruzada:** añadir `principal` al contrato `contactos` de `docs/api-contrato.md` y coordinar con el repo `boton-de-seguridad-api` para que M14 sincronice.
- M13 (SQLite) ya existe como hito; M5 añade solo una columna a la tabla existente.
- No hay dependencias nuevas de librerías: `react-native-gesture-handler` y `react-native-reanimated` ya están instalados (M3).
