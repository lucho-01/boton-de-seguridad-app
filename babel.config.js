/**
 * Preset de Babel de la app (Expo SDK 58).
 *
 * `babel-preset-expo` ya incluye el soporte de React Native, JSX, TypeScript y
 * la transformación que necesita Reanimated 4 (no hace falta añadir
 * `react-native-reanimated/plugin` a mano). Lo usan Metro y Jest.
 *
 * Bajo Jest se desactivan los imports ESM de `react-native-web` para que
 * `@testing-library/react-native` comparta una sola copia de su registro
 * interno (`screen` se quedaba «detached» y `render` no encontraba el árbol).
 */
module.exports = function configurarBabel(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
