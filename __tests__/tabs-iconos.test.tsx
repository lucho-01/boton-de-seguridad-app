/**
 * Spec M0 · las pestañas muestran iconos y nombres accesibles (`app/(tabs)/_layout.tsx`).
 *
 * Mockea `expo-router` para capturar las opciones de cada `Tabs.Screen` sin
 * navegar. Verifica que cada pestaña tenga `tabBarLabel`,
 * `tabBarAccessibilityLabel` y una función `tabBarIcon`.
 *
 * Dentro del factory de `jest.mock` solo se permiten `jest.requireActual` y
 * objetos globales (`globalThis`). Las opciones capturadas se guardan en
 * `globalThis.__mockOpcionesTabs`.
 */

declare global {
  var __mockOpcionesTabs: Array<{ nombre: string; opciones: Record<string, unknown> }> | undefined;
}

import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  const { Text: TextoNativo } = jest.requireActual("react-native");

  globalThis.__mockOpcionesTabs = [];

  return {
    __esModule: true,
    Stack: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement(TextoNativo, null, "Stack", children ?? null),
      {
        Screen: (props: { name: string; children?: React.ReactNode }) =>
          React.createElement(TextoNativo, null, `pantalla:${props.name}`, props.children ?? null),
      },
    ),
    Tabs: Object.assign(
      ({ children }: { children?: React.ReactNode }) =>
        React.createElement(TextoNativo, null, "Tabs", children ?? null),
      {
        Screen: (props: {
          name: string;
          options?: Record<string, unknown>;
          children?: React.ReactNode;
        }) => {
          if (props.options) {
            (
              globalThis.__mockOpcionesTabs as Array<{
                nombre: string;
                opciones: Record<string, unknown>;
              }>
            ).push({
              nombre: props.name,
              opciones: props.options,
            });
          }
          return React.createElement(
            TextoNativo,
            null,
            `pestana:${props.name}`,
            props.children ?? null,
          );
        },
      },
    ),
    Link: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(TextoNativo, null, "Link", children ?? null),
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
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

import TabsLayout from "../app/(tabs)/_layout";

const ESPERA: Array<{
  nombre: string;
  label: string;
}> = [
  { nombre: "index", label: "Alerta" },
  { nombre: "contactos", label: "Contactos" },
  { nombre: "historial", label: "Historial" },
];

function obtenerPantallas(): Array<{ nombre: string; opciones: Record<string, unknown> }> {
  return (
    (globalThis.__mockOpcionesTabs as Array<{
      nombre: string;
      opciones: Record<string, unknown>;
    }>) ?? []
  );
}

describe("pestañas · iconos y accesibilidad", () => {
  beforeEach(() => {
    obtenerPantallas().length = 0;
  });

  it("registra las tres pantallas con nombre y opciones", async () => {
    await render(<TabsLayout />);

    const nombres = obtenerPantallas().map((p) => p.nombre);
    for (const esperado of ESPERA) {
      expect(nombres).toContain(esperado.nombre);
    }
  });

  it.each(ESPERA)("la pestaña %s tiene label, accessibilityLabel y tabBarIcon", async (caso) => {
    await render(<TabsLayout />);

    const captura = obtenerPantallas().find((p) => p.nombre === caso.nombre);
    expect(captura).toBeDefined();
    expect(captura?.opciones["tabBarLabel"]).toBe(caso.label);
    expect(captura?.opciones["tabBarAccessibilityLabel"]).toBe(caso.label);
    expect(typeof captura?.opciones["tabBarIcon"]).toBe("function");
  });
});
