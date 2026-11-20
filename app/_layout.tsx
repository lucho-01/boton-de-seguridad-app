import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SesionProvider } from "@/controllers/sesionContext";

/** Raíz de la app: gestos, áreas seguras, sesión y navegación en pila. */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SesionProvider>
          <StatusBar style="dark" />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
            <Stack.Screen name="registro" options={{ title: "Crear cuenta" }} />
            <Stack.Screen name="login" options={{ title: "Ingresar" }} />
          </Stack>
        </SesionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
