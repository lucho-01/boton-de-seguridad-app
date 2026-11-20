/**
 * Spec M0 · §3 y §8.1 (`app/_layout.tsx`).
 *
 * La raíz se monta con el `SesionProvider` real: el secure store está simulado
 * y vacío, así que el controlador arranca «sin sesión» sin tocar la red (el
 * `fetch` también está mockeado y nunca se llega a llamar). Solo se sustituyen
 * `expo-router`, la barra de estado y las dos piezas nativas que en Jest no se
 * pueden montar (`SafeAreaProvider` y `GestureHandlerRootView` envuelven
 * marcos nativos).
 *
 * Fuera de las fábricas de `jest.mock` sólo se usan globals, para no capturar
 * variables del módulo en un punto en que aún no están definidas.
 */

import { render, screen } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");

  return {
    __esModule: true,
    Stack: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement(Text, null, "Stack", children ?? null),
      {
        Screen: (props: { name: string; children?: React.ReactNode }) =>
          React.createElement(Text, null, `pantalla:${props.name}`, props.children ?? null),
      },
    ),
    Tabs: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement(Text, null, "Tabs", children ?? null),
      {
        Screen: (props: { name: string; children?: React.ReactNode }) =>
          React.createElement(Text, null, `pestana:${props.name}`, props.children ?? null),
      },
    ),
    Link: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, "Link", children ?? null),
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children ?? null),
  };
});

jest.mock("expo-status-bar", () => {
  return { __esModule: true, StatusBar: () => null };
});

import RootLayout from "../app/_layout";

describe("app/_layout · §8.1", () => {
  it("monta la raíz con el proveedor de sesión y la navegación sin romper", async () => {
    await render(<RootLayout />);

    expect(screen.getByText(/^Stack/)).toBeOnTheScreen();
    expect(screen.getByText(/pantalla:\(tabs\)/)).toBeOnTheScreen();
    expect(screen.getByText(/pantalla:ajustes/)).toBeOnTheScreen();
  });

  it("registra las dos rutas del Stack: pestañas y ajustes", async () => {
    await render(<RootLayout />);

    expect(screen.queryAllByText(/pantalla:ajustes/)).toHaveLength(1);
  });
});
