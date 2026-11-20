import { Link, Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

function estiloBotonAjustes({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> {
  if (pressed) {
    return [styles.botonAjustes, styles.presionado];
  }
  return styles.botonAjustes;
}

/** Botón del header que abre «Ajustes» (alternativa accesible a cualquier gesto). */
function BotonAjustes() {
  return (
    <Link href="/ajustes" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir ajustes"
        accessibilityHint="Muestra el estado del servidor y de la sesión"
        hitSlop={8}
        style={estiloBotonAjustes}
      >
        <Text allowFontScaling maxFontSizeMultiplier={2} style={styles.textoAjustes}>
          Ajustes
        </Text>
      </Pressable>
    </Link>
  );
}

/** Pestañas del producto: alerta, contactos e historial, con acceso a ajustes. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0B5FFF",
        tabBarInactiveTintColor: "#4A5560",
        tabBarLabelStyle: styles.etiquetaPestana,
        tabBarAllowFontScaling: true,
        tabBarStyle: styles.barraPestanas,
        headerRight: BotonAjustes,
        headerRightContainerStyle: styles.zonaBotonHeader,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Alerta", tabBarLabel: "Alerta", tabBarAccessibilityLabel: "Alerta" }}
      />
      <Tabs.Screen
        name="contactos"
        options={{
          title: "Contactos",
          tabBarLabel: "Contactos",
          tabBarAccessibilityLabel: "Contactos",
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: "Historial",
          tabBarLabel: "Historial",
          tabBarAccessibilityLabel: "Historial",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  botonAjustes: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textoAjustes: {
    color: "#0B5FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  presionado: {
    opacity: 0.6,
  },
  etiquetaPestana: {
    fontSize: 13,
  },
  barraPestanas: {
    minHeight: 56,
  },
  zonaBotonHeader: {
    paddingRight: 8,
  },
});
