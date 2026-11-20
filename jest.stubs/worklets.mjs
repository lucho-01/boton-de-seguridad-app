/**
 * Sustituto de `react-native-worklets` para Jest.
 *
 * Gesture Handler 3 importa `scheduleOnRN` del runtime de worklets. En Jest no
 * hay runtime nativo, así que se ejecuta la función en el hilo de JS (que es el
 * único hilo que existe aquí). Es solo para pruebas.
 *
 * Extensión `.mjs` para que ESLint no lo analice como TypeScript (jest-expo
 * transforma todo `.js`/`.mjs` de `moduleNameMapper`, así que sigue cargando).
 */
const NOOP = () => undefined;

function scheduleOnRN(funcion, ...args) {
  return funcion(...args);
}

module.exports = {
  __esModule: true,
  getUIRuntimeHolder: () => null,
  getUIScheduler: () => null,
  isWorkletFunction: () => false,
  runOnJS: (funcion) => funcion,
  runOnUI: (funcion) => funcion,
  scheduleOnRN,
  scheduleOnUI: scheduleOnRN,
  createWorkletRuntime: NOOP,
  runOnRuntime: NOOP,
  WorkletsModule: {},
  default: { scheduleOnRN },
};
