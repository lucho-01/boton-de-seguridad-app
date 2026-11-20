/**
 * Declaraciones del entorno de Metro que faltan en `expo/types` (SDK 58).
 *
 * Metro inyecta `__DEV__` en tiempo de compilación, pero el paquete de Expo no
 * tipa el identificador. Un `.d.ts` con `export {}` no altera los globales del
 * proyecto; solo declara lo que el cliente HTTP necesita.
 */
declare global {
  var __DEV__: boolean;
}

export {};
