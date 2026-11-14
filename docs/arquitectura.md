# Arquitectura de la app

MVC dentro de cada capa, con Expo Router como navegación. Decisión en `docs/adr/0001-arquitectura-mvc.md`.

## Mapa

```text
app/                      Vistas (rutas de Expo Router)
  _layout.tsx             Stack/Tabs, GestureHandlerRootView, proveedor de sesión
  (tabs)/index.tsx        Botón SOS
  (tabs)/contactos.tsx    Contactos (máx. 5)
  (tabs)/historial.tsx    Alertas enviadas y canceladas
  ajustes.tsx             Sensibilidad y mensaje base
src/
  models/                 Tipos en snake_case (contrato con la API y SQLite)
  db/                     Apertura de SQLite y migraciones
  repositories/           SQL parametrizado
  services/               Reglas puras (mensaje, sacudidas, validaciones, cuenta regresiva)
  controllers/            Hooks que unen servicios, sensores, repositorio y API
  sensors/                Hooks delgados de hardware
  api/                    Cliente HTTP + contratos Zod
  sync/                   Envío de pendientes y traída de cambios
  components/             UI accesible reutilizable
__tests__/                Pruebas (Jest)
ia/                       Configuración de IA: bitácora y pruebas
docs/                     Producto, contrato, features, specs, ADR, handoffs
.opencode/                Agentes, skills, plugin y guard
```

## Flujo de una acción

```text
Pantalla (View) ──▶ controller ──▶ servicio (puro) ──▶ repositorio SQLite
                                     │
                                     └──▶ sync ──▶ cliente de la API ──▶ API (otro repo)
```

- La pantalla **no** hace SQL ni `fetch`.
- Los servicios son **puros** (sin hardware, sin red, con el tiempo inyectado).
- Los sensores solo leen hardware; la decisión (3 sacudidas en 2 s) vive en un servicio.
- La app escribe primero en SQLite (`pending = 1`) y sincroniza después.

## Conexión con la API

Ver `docs/api-contrato.md`:

1. `EXPO_PUBLIC_API_URL` es lo único público; no hay credenciales en la app.
2. Los tokens viven en `expo-secure-store`.
3. Ante `401`, un único refresh y reintento; si falla, vuelta al login.
4. Toda respuesta se valida con Zod en `src/api/`.

## Fronteras

| Desde                | Puede importar                                    | No puede importar                                        |
| -------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `app/**` (pantallas) | `src/controllers`, `src/models`, `src/components` | `src/db`, `src/repositories`, `src/api`, `fetch` directo |
| `src/components/**`  | `src/models`, otros componentes                   | controladores, repositorios, API                         |
| `src/services/**`    | `src/models`                                      | hardware, red, SQLite                                    |
| `src/controllers/**` | servicios, sensores, repositorios, API, modelos   | `app/**`                                                 |
| `src/api/**`         | modelos y sus contratos, `expo-secure-store`      | SQLite, pantallas                                        |

Las fronteras se vigilan con `no-restricted-imports` en `npm run lint`.
