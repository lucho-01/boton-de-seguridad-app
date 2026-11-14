/**
 * Preset de Babel para Jest.
 *
 * Espera a M0: cuando M0 instale el SDK de Expo, `babel-preset-expo` (ya en devDependencies)
 * reemplaza a este preset con sus opciones, y las pruebas de la app podrán importar
 * `react-native`, `expo-*` y JSX. Hoy solo se transpila TypeScript a CommonJS para las
 * pruebas de `ia/`, que no dependen de Expo.
 */
module.exports = {
  presets: ["@babel/preset-typescript"],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
};
