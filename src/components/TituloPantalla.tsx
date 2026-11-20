import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";

import { COLOR, ESPACIO } from "@/components/tema";

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
    color: COLOR.texto,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: ESPACIO.xs,
  },
});
