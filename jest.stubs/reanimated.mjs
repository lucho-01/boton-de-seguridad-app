/**
 * Sustituto de `react-native-reanimated` para Jest.
 *
 * Reanimated 4 registra sus worklets en el runtime de la UI al importarse y ese
 * runtime no existe en Jest. Este archivo expone lo que usan las vistas y los
 * controladores de la app con un comportamiento síncrono y determinista:
 * valores compartidos reales, estilos evaluados una vez y gestos no ejecutados.
 *
 * Es solo para pruebas: la app en el dispositivo usa el paquete real.
 *
 * Extensión `.mjs` para que ESLint no lo analice como TypeScript (jest-expo
 * transforma todo `.js`/`.mjs` de `moduleNameMapper`, así que sigue cargando).
 */
const React = require("react");
const { FlatList, Image, ScrollView, Text, View } = require("react-native");

const NOOP = () => undefined;

function crearValorCompartido(valorInicial) {
  const contenedor = { value: valorInicial };
  contenedor.get = () => contenedor.value;
  contenedor.set = (nuevo) => {
    if (typeof nuevo === "function") {
      contenedor.value = nuevo(contenedor.value);
      return;
    }
    contenedor.value = nuevo;
  };
  return contenedor;
}

function useSharedValue(valorInicial) {
  return React.useRef(crearValorCompartido(valorInicial)).current;
}

function useAnimatedStyle(creador) {
  return creador();
}

function useDerivedValue(creador) {
  return crearValorCompartido(creador());
}

function crearComponenteAnimado(Componente) {
  const nombre = `Animated(${String(Componente.displayName ?? Componente.name ?? "Componente")})`;
  const Envoltorio = (props) => React.createElement(Componente, props);
  Envoltorio.displayName = nombre;
  return Envoltorio;
}

const Animated = {
  View: crearComponenteAnimado(View),
  Text: crearComponenteAnimado(Text),
  Image: crearComponenteAnimado(Image),
  ScrollView: crearComponenteAnimado(ScrollView),
  FlatList: crearComponenteAnimado(FlatList),
  createAnimatedComponent: crearComponenteAnimado,
};

const animaciones = {
  cancelAnimation: NOOP,
  withDelay: (_retraso, animacion) => animacion,
  withRepeat: (animacion) => animacion,
  withSequence: (...animacionesSucesivas) => animacionesSucesivas[0],
  withSpring: (valor, _config, callback) => {
    if (typeof callback === "function") {
      callback(true);
    }
    return valor;
  },
  withTiming: (valor, _config, callback) => {
    if (typeof callback === "function") {
      callback(true);
    }
    return valor;
  },
};

const utilidades = {
  runOnJS: (funcion) => funcion,
  runOnUI: (funcion) => funcion,
  interpolate: NOOP,
  interpolateColor: NOOP,
  Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
  Easing: { linear: (valor) => valor, ease: (valor) => valor },
  ReduceMotion: { System: "system", Always: "always", Never: "never" },
  isSharedValue: (valor) => {
    return Boolean(valor) && typeof valor === "object" && "value" in valor;
  },
};

const componentes = {
  PerformanceMonitor: () => null,
  ReducedMotionConfig: ({ children }) => children,
  LayoutAnimationConfig: ({ children }) => children,
};

module.exports = {
  __esModule: true,
  ...animaciones,
  ...utilidades,
  ...componentes,
  default: Animated,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedProps: (creador) => creador(),
  useAnimatedReaction: NOOP,
  useAnimatedScrollHandler: () => NOOP,
  useAnimatedRef: () => ({ current: null }),
  useFrameCallback: () => ({ callbackId: -1, isActive: false, setActive: NOOP }),
  useEvent: () => NOOP,
  useHandler: () => ({ context: {}, doDependenciesDiffer: false, useWeb: false }),
  useComposedEventHandler: () => NOOP,
  useAnimatedSensor: () => ({
    sensor: { value: { x: 0, y: 0, z: 0 } },
    unregister: NOOP,
    isAvailable: false,
  }),
  useScrollViewOffset: () => crearValorCompartido(0),
  useReducedMotion: () => false,
};
