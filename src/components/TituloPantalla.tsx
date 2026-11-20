import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";

interface TituloPantallaProps {
  /** Título principal de la pantalla (se anuncia como encabezado). */
  children: ReactNode;
}

/** Título de pantalla: encabezado accesible con texto base grande. */
export function TituloPantalla({ children }: TituloPantallaProps) {
  return (
    <Text
      accessibilityRole="header"
      allowFontScaling
      maxFontSizeMultiplier={2}
      style={styles.titulo}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  titulo: {
    color: "#11181C",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
});
