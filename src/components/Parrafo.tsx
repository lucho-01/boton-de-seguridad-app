import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";

interface ParrafoProps {
  /** Texto informativo de la pantalla. */
  children: ReactNode;
}

/** Párrafo informativo: texto base de 16, escala con el tamaño del sistema. */
export function Parrafo({ children }: ParrafoProps) {
  return (
    <Text
      accessibilityRole="text"
      allowFontScaling
      maxFontSizeMultiplier={2}
      style={styles.parrafo}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  parrafo: {
    color: "#1F2933",
    fontSize: 16,
    lineHeight: 24,
  },
});
