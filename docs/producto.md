# Producto — 36 · Botón de seguridad con contactos de confianza (App)

**En una frase:** botón de alerta que, tras una cuenta regresiva cancelable, prepara un SMS con tu ubicación para tus contactos de confianza.

La app móvil (Expo) es este repositorio; la API es `boton-de-seguridad-api`. Proyecto **atómico**: no se agregan funciones fuera de este documento.

## Problema y usuario

Persona que camina sola de noche o viaja y quiere avisar rápido dónde está.

## Pantallas (Expo Router)

| Ruta               | Contenido                                              |
| ------------------ | ------------------------------------------------------ |
| `(tabs)/index`     | Botón SOS grande y estado de la detección por sacudida |
| `(tabs)/contactos` | Contactos de confianza (máximo 5)                      |
| `(tabs)/historial` | Alertas enviadas y canceladas                          |
| `ajustes`          | Sensibilidad de la sacudida y mensaje base             |

## Gestos (mínimo 2, todos con alternativa por botón)

| Gesto                            | Uso                                    |
| -------------------------------- | -------------------------------------- |
| Mantener presionado 3 s          | Armar la alerta con anillo de progreso |
| Deslizar hacia un lado           | Cancelar la cuenta regresiva           |
| Deslizar contacto a la izquierda | Eliminar contacto                      |
| Doble toque en un contacto       | Marcarlo como principal                |

Cada gesto tiene un botón equivalente con `accessibilityLabel`.

## Sensores y capacidades (mínimo 2)

| Capacidad              | Uso                                                                     | Alternativa                        |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| `expo-sms` (principal) | Abre el redactor con mensaje y destinatarios; la persona pulsa «Enviar» | Copiar el mensaje / entrada manual |
| `Accelerometer`        | Sacudida fuerte tres veces                                              | Solo el botón                      |
| `expo-location`        | Ubicación para el mensaje                                               | Mensaje sin coordenadas (lo dice)  |
| `expo-battery`         | Nivel de batería en el mensaje                                          | Omitirlo                           |
| `expo-haptics`         | Vibración por segundo de la cuenta                                      | Solo visual                        |

Reglas: `isAvailableAsync()` antes de usar; permisos solo al activar la función y explicados; `subscription.remove()` al salir; la app nunca se rompe si falta el sensor.

## Requisitos funcionales

- **RF-01** CRUD de contactos de confianza (máx. 5, teléfono válido).
- **RF-02** Botón SOS: long press 3 s inicia cuenta regresiva de 5 s **cancelable**.
- **RF-03** Detección opcional de sacudida triple para iniciar la cuenta.
- **RF-04** Al terminar: ubicación + batería + mensaje con enlace de mapa + redactor de SMS.
- **RF-05** Registrar cada alerta (cancelada o con mensaje preparado) en historial local y en la API.
- **RF-06** Aviso permanente: proyecto educativo, **no reemplaza** la línea de emergencias (Colombia, 123).

## Validaciones

- Teléfono de 10 dígitos; máximo 5 contactos; sin duplicados.
- Mensaje ≤ 160 caracteres: se acorta el texto base, **nunca** el enlace.
- Sin ubicación, el mensaje lo indica en lugar de inventar coordenadas.

## Datos locales (SQLite)

```sql
CREATE TABLE contacto_confianza (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, telefono TEXT NOT NULL, parentesco TEXT
);
CREATE TABLE alerta (
  id TEXT PRIMARY KEY, lat REAL, lng REAL, precision_m REAL, bateria_pct INTEGER,
  estado TEXT NOT NULL CHECK (estado IN ('cancelada','mensaje_preparado')), creada_en TEXT NOT NULL
);
```

Además, en cada tabla: `remote_id`, `updated_at`, `deleted DEFAULT 0`, `pending DEFAULT 0`.

## Criterios de aceptación

1. Dado que mantengo el botón 3 s, empieza la cuenta regresiva y puedo cancelarla con un toque.
2. Dado que no la cancelo, se abre el redactor de SMS con mis contactos y el enlace de mi ubicación.
3. Dado un dispositivo sin SMS disponible, la app lo avisa y ofrece copiar el mensaje.
4. Dado que niego la ubicación, el mensaje se compone sin coordenadas y lo dice.

## Lo que la app NO hace

- No envía SMS en silencio ni en segundo plano.
- No contiene claves de Firebase, de servicio ni de terceros.
- No habla con Firestore ni con Firebase Auth: todo pasa por la API.
