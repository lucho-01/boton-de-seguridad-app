# Spec M4 · Contactos de confianza: listado, alta y edición

- **Estado:** Aprobada
- **Feature:** M4 — Contactos: listado, alta y edición con validación (máx. 5) (`docs/features.md`)
- **Fecha:** 2026-11-19
- **Aprobada por:** la persona el 2026-11-19 (respuestas a las 8 preguntas abiertas)

## 1. Contexto y objetivo

Una persona que camina sola necesita avisar a alguien de confianza: para eso guarda hasta 5 contactos con nombre y teléfono en su propio dispositivo, y los revisa, agrega y corrige desde la pestaña «Contactos».

**Al terminar:** la pestaña «Contactos» muestra la lista de contactos de confianza guardados en el dispositivo, y desde ella se pueden agregar, editar y eliminar.

## 2. Alcance

- **Incluye:**
  - Listado de los contactos de confianza guardados en el dispositivo, con estado vacío.
  - Alta de contacto: nombre, teléfono y parentesco opcional.
  - Edición de un contacto existente.
  - Eliminación de un contacto **con botón** y confirmación (el gesto de deslizar es de M5).
  - Validaciones: teléfono de 10 dígitos, máximo 5 contactos, sin duplicados por teléfono, nombres obligatorios de hasta 40 caracteres.
  - Persistencia local en SQLite (`expo-sqlite`), escribiendo primero en local con `pending = 1`.
  - Pruebas: servicio puro de validaciones, controlador con repositorio falso y render de la pantalla.
- **No incluye:**
  - Gestos de M5 (deslizar para eliminar, doble toque para marcar principal).
  - Marcar un contacto como «principal» (ver pregunta abierta 4; el modelo y el contrato actuales no tienen ese campo).
  - Sincronización con la API: es M14. **M4 no hace ninguna llamada a la API.**
  - SMS, mensaje y composición del texto: es M10.
  - Usar los contactos en la cuenta regresiva: es M10.
  - Historial de alertas: es M12.
  - Sesión y registro: es M1 (M4 funciona sin conexión y sin cuenta).

## 3. Pantalla y gestos

Ruta `(tabs)/contactos`, dentro de `PantallaConAviso` (el aviso de la línea 123 sigue visible).

| Elemento        | Detalle                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| Título          | «Contactos» (ya existe `TituloPantalla`)                                                   |
| Lista           | Una fila por contacto: nombre, teléfono y parentesco cuando existe                         |
| Botón por fila  | «Editar» y «Eliminar», con `accessibilityRole="button"` y `accessibilityLabel` propio      |
| Botón principal | «Añadir contacto»                                                                          |
| Estado vacío    | «Todavía no tienes contactos de confianza.» + «Añadir contacto»                            |
| Formulario      | Ruta propia `app/contacto.tsx`: sin `id` es alta, con `id` es edición                      |
| Confirmación    | Al eliminar se pide confirmación: «¿Eliminar el contacto "X"?» con «Cancelar» y «Eliminar» |

**M4 no introduce gestos.** Todos los contactos se modifican con botones (alternativa accesible por definición). M5 añadirá deslizar para eliminar y doble toque para principal, cada uno con su botón equivalente.

Accesibilidad: cada control con `accessibilityRole="button"`, etiqueta propia y objetivo táctil ≥ 44 × 44; el formulario anuncia el error de un campo con la misma etiqueta del campo (nada de mensajes solo por color).

## 4. Sensores y permisos

- Ninguno. M4 no pide permisos ni usa sensores.

## 5. Reglas de negocio

| #   | Regla                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | El teléfono tiene exactamente **10 dígitos** numéricos (celular colombiano); se rechaza cualquier otro largo o carácter. Se guardan los 10 dígitos: el prefijo `+57` se aplica al componer el SMS (M10). |
| R2  | El nombre es obligatorio y de 1 a 40 caracteres, tras recortar los espacios de los extremos.                                                                                                             |
| R3  | El parentesco es opcional, de hasta 40 caracteres; si no se escribe, se guarda como `null`.                                                                                                              |
| R4  | Como máximo **5 contactos**. Con 5, el botón «Añadir contacto» queda deshabilitado y se muestra «No puedes tener más de 5 contactos de confianza.» Editar un contacto que ya existe sí se permite.       |
| R5  | No puede haber dos contactos con el mismo teléfono, aunque tengan nombres distintos.                                                                                                                     |
| R6  | El contacto se borra con borrado lógico (`deleted = 1`), no con un `DELETE` físico.                                                                                                                      |
| R7  | Cada contacto lo genera la app con un UUID y se escribe con `pending = 1`.                                                                                                                               |
| R8  | La lista se ordena por nombre, sin distinguir mayúsculas.                                                                                                                                                |
| R9  | Al guardar, la pantalla avisa el resultado (contacto guardado, error de validación, borrado).                                                                                                            |
| R10 | Guardar un contacto **nunca** borra datos de otros: si la escritura falla, la lista anterior sigue intacta.                                                                                              |
| R11 | Sin conexión a internet el flujo es idéntico: M4 no usa la red.                                                                                                                                          |

## 6. Datos y contrato con la API

Tabla local (de `docs/producto.md`), con los campos de sincronización de `src/models/index.ts`:

```sql
CREATE TABLE contacto_confianza (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  parentesco TEXT,
  remote_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  deleted INTEGER NOT NULL DEFAULT 0
);
```

- La app escribe primero en local con `pending = 1`; la sincronización es M14.
- **Sin API en M4:** ni `GET /api/contactos`, ni `PUT`, ni `DELETE`. No hay dependencia cruzada con el repo de la API.
- El modelo `ContactoConfianza` de `src/models/index.ts` ya tiene estos campos; **no se modifica**.
- Capas: `src/services/` (validaciones puras) → `src/repositories/` (SQL parametrizado con `?`) → `src/controllers/` (hook) → `src/components/` y `app/` (solo estado y callbacks).
- El controlador depende de una **interfaz** de repositorio, para que las pruebas usen un doble en memoria y no SQLite.

## 7. Errores y fallo seguro

| Situación                | Qué ve la persona                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Teléfono inválido        | «El teléfono debe tener 10 dígitos.» junto al campo                                |
| Teléfono repetido        | «Ese número ya está entre tus contactos.» junto al campo                           |
| Ya hay 5 contactos       | «No puedes tener más de 5 contactos de confianza.» y el botón queda deshabilitado  |
| Nombre vacío             | «Escribe el nombre del contacto.» junto al campo                                   |
| Falla la escritura local | «No se pudo guardar el contacto. Intenta otra vez.»; la lista anterior queda igual |

## 8. Criterios de aceptación

1. Dado que no hay contactos, cuando abro la pestaña «Contactos», entonces veo el estado vacío y el botón «Añadir contacto».
2. Dado el formulario de alta, cuando escribo nombre y un teléfono de 10 dígitos y guardo, entonces el contacto aparece en la lista y sigue ahí al reiniciar la app.
3. Dado el formulario de alta, cuando escribo un teléfono de 9 o 11 dígitos, entonces veo el error y **no** se guarda nada.
4. Dado un contacto guardado, cuando escribo su mismo teléfono en otro contacto, entonces veo el error de duplicado y no se crea el segundo.
5. Dado 5 contactos, cuando intento agregar uno más, entonces el botón está deshabilitado y veo el aviso del límite.
6. Dado un contacto, cuando pulso «Editar», cambio su nombre y guardo, entonces la lista muestra el nombre nuevo.
7. Dado un contacto, cuando pulso «Eliminar» y confirmo, entonces desaparece de la lista; si cancelo la confirmación, sigue ahí.
8. Dado la lista, cuando la recorro con lector de pantalla, entonces cada fila expone botones «Editar» y «Eliminar» con etiqueta propia.
9. Dado que no hay red, cuando agrego, edito o elimino un contacto, entonces todo funciona igual (M4 no usa la red).

## 9. Pruebas previstas

- Servicio puro de validaciones: teléfono válido e inválido (9, 11, letras, vacío), nombre vacío y con espacios, parentesco opcional, duplicados, límite de 5 (5 y 6).
- Controlador con repositorio falso: alta, edición, borrado lógico, orden por nombre, error al escribir, aviso de resultado.
- Repositorio: SQL parametrizado (revisión del código) y, si el SDK lo permite en Jest, lectura y escritura reales.
- Render de la pantalla: estado vacío, lista con un contacto, errores del formulario, confirmación al eliminar.

## 10. Preguntas abiertas

Resueltas por la persona el 2026-11-19.

| #   | Pregunta                                                              | Propuesta                                                                                               | Respuesta de la persona    |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | ¿M4 guarda en SQLite o solo en memoria hasta que llegue M13 (SQLite)? | SQLite ya: la app no debe perder contactos al reiniciar y el offline-first ya está decidido (ADR-0003)  | **SQLite desde M4**        |
| 2   | ¿Qué teléfonos se aceptan?                                            | 10 dígitos, celular colombiano; se guardan los 10 dígitos y el `+57` se aplica al componer el SMS (M10) | **10 dígitos, Colombia**   |
| 3   | ¿El duplicado se detecta por teléfono o también por nombre?           | Por teléfono (mismo número = mismo contacto, aunque el nombre cambie)                                   | **Por teléfono**           |
| 4   | ¿«Marcar como principal» entra en M4 o queda en M5?                   | Queda en M5: el modelo y el contrato con la API no tienen ese campo y añadirlo es dependencia cruzada   | **Queda para M5**          |
| 5   | ¿Dónde vive el formulario?                                            | Ruta propia `app/contacto.tsx` (alta y edición en la misma pantalla)                                    | **Ruta propia**            |
| 6   | ¿Eliminar pide confirmación?                                          | Sí: «¿Eliminar el contacto "X"?» con «Cancelar» y «Eliminar»                                            | **Sí, con confirmar**      |
| 7   | ¿Cómo se ordena la lista?                                             | Por nombre, sin distinguir mayúsculas (no hay campo de orden en el modelo)                              | **Alfabético por nombre**  |
| 8   | ¿Máximos de longitud de nombre y parentesco?                          | 40 caracteres cada uno                                                                                  | **40 caracteres cada uno** |

## 11. Decisiones y dependencias

- Sin dependencias nuevas: `expo-sqlite` ya está instalado (ADR-0006) y `src/models/index.ts` ya define `ContactoConfianza`.
- **SQLite desde M4** (decisión de la persona): M4 crea `src/db/` (apertura y migración de `contacto_confianza`) y `src/repositories/contactos.ts`. M13 (SQLite) sigue como hito propio para las migraciones completas, la tabla de alertas y el CRUD de alertas.
- **Dependencia cruzada futura (no en M4):** M5 necesita el gesto de doble toque y, si «principal» se guarda, un campo nuevo en SQLite **y** en el contrato con la API (`contactos`), que se coordinaría con el repo `boton-de-seguridad-api`.
- M4 no toca `src/api/**`: la sincronización es M14.
- M13 (SQLite) queda como hito propio: migraciones completas, tabla de alertas y CRUD de alertas.
