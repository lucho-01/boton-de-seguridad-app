# Empezar

## 1. Lo que haces tú (los agentes no pueden)

1. **Node 24.x**, npm y git.
2. **OpenCode** (`npm i -g opencode-ai`) y `/connect` con el modelo que uses.
3. **La API desplegada** (`boton-de-seguridad-api` en Vercel). Sin ella no hay login ni sincronización. Comprueba `GET /api/health` desde el teléfono.
4. **Archivo de entorno:** copia `.env.example` a `.env` y pon `EXPO_PUBLIC_API_URL` con la URL HTTPS de tu API. No hay más variables: **ningún secreto va en la app**. Los agentes no leen el `.env` (el guard lo bloquea).
5. **Dispositivo físico** para probar sensores y SMS (muchos no existen en el emulador).
6. Cuando toque: cuenta de **Expo (EAS)** para generar el APK, y Firebase solo en la API.

## 2. Verificar la línea base

```bash
npm install
npm run check     # formato + lint + tipos + pruebas: debe quedar en verde
```

`npm test` incluye las pruebas de `ia/`, que demuestran que las restricciones de la IA funcionan.

## 3. Cómo se construye cada feature

1. El orquestador escribe la especificación con `write-spec` y **te hace las preguntas abiertas**, una por una, con su propuesta.
2. Tú revisas la spec y la cambias a _Aprobada_. Sin eso, nadie escribe código.
3. El orquestador fija el contrato (`src/models`, `src/api/contracts`) y delega por zonas (`feature-workflow`).
4. `npm run check` en verde, revisión de `security`, nota en `docs/handoffs/` y `docs/progreso.md` actualizado.
5. Prueba en un dispositivo físico antes de pasar a la siguiente feature.

## 4. Primer mensaje (en OpenCode, en esta carpeta)

> Lee `AGENTS.md`, `docs/empezar.md`, `docs/arquitectura.md`, `docs/producto.md`, `docs/api-contrato.md` y `docs/features.md`. Vamos a construir la app desde cero. Empieza por M0: usa la skill `write-spec` para escribir su especificación, hazme las preguntas abiertas una por una (con tu propuesta) y no implementes nada hasta que yo la apruebe.

## 5. Problemas conocidos

| Síntoma                                 | Causa                                         | Qué hacer                                             |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Un hook del guard falla al empezar      | Faltan dependencias                           | `npm install`                                         |
| La app no conecta con la API            | `EXPO_PUBLIC_API_URL` vacía o con barra final | Revisar `.env` (tú, no el agente)                     |
| Funciona en Expo Go pero no en el APK   | URL con `localhost`                           | Usar la URL de Vercel (HTTPS)                         |
| Cambias `EXPO_PUBLIC_*` y no se refleja | Se lee al compilar                            | Reiniciar Metro con caché limpia o reconstruir el APK |
| Un sensor no responde                   | Emulador sin hardware                         | Probar en un dispositivo físico                       |
