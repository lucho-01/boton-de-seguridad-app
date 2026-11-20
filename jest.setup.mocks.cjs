/**
 * Almacén en memoria de `expo-secure-store` y mocks oficiales de Gesture
 * Handler. Se monta desde `jest.setup.cjs`; el almacén se vacía después de cada
 * prueba. Reanimated y worklets los resuelve `moduleNameMapper` con `jest.stubs/`.
 */
const secureStore = require("./jest.setup.secretStore.cjs");

jest.mock("expo-secure-store", () => {
  const mockSecureStore = require("./jest.setup.secretStore.cjs");
  return {
    __esModule: true,
    getItemAsync: async (clave) => {
      return mockSecureStore.leerClave(clave);
    },
    setItemAsync: async (clave, valor) => {
      mockSecureStore.escribirClave(clave, valor);
    },
    deleteItemAsync: async (clave) => {
      mockSecureStore.borrarClave(clave);
    },
    isAvailableAsync: async () => {
      return true;
    },
    getItem: (clave) => {
      return mockSecureStore.leerClave(clave);
    },
    setItem: (clave, valor) => {
      mockSecureStore.escribirClave(clave, valor);
    },
    deleteItem: (clave) => {
      mockSecureStore.borrarClave(clave);
    },
  };
});

jest.mock("expo-sensors", () => {
  return {
    __esModule: true,
    Accelerometer: {
      isAvailableAsync: jest.fn(async () => true),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      setUpdateInterval: jest.fn(),
    },
  };
});

jest.mock("react-native-gesture-handler/lib/module/RNGestureHandlerModule", () => {
  return require("react-native-gesture-handler/lib/module/mocks/module");
});
jest.mock("react-native-gesture-handler/lib/module/components/GestureButtons", () => {
  return require("react-native-gesture-handler/lib/module/mocks/GestureButtons");
});
jest.mock("react-native-gesture-handler/lib/module/components/Pressable/Pressable", () => {
  return require("react-native-gesture-handler/lib/module/mocks/Pressable");
});
jest.mock("react-native-gesture-handler/lib/module/components/GestureComponents", () => {
  return require("react-native-gesture-handler/lib/module/mocks/gestureComponents");
});
jest.mock("react-native-gesture-handler/lib/module/components/touchables", () => {
  return require("react-native-gesture-handler/lib/module/mocks/Touchables");
});
jest.mock("react-native-gesture-handler/lib/module/v3/detectors/HostGestureDetector", () => {
  return require("react-native-gesture-handler/lib/module/mocks/hostDetector");
});

afterEach(() => {
  secureStore.resetSecureStore();
});
