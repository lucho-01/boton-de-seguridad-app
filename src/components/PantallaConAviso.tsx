import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvisoLinea123 } from "@/components/AvisoLinea123";

interface PantallaConAvisoProps {
  /** Contenido propio de la pantalla. */
  children: ReactNode;
  /** Si la pantalla ya lleva barra de pestañas abajo, no se reserva otro margen. */
  conBarraDePestanas?: boolean;
}

const ESPACIO_INFERIOR = {
  con_pestanas: 80,
  sin_pestanas: 24,
};

function espacioInferior(conBarraDePestanas: boolean): number {
  if (conBarraDePestanas) {
    return ESPACIO_INFERIOR.con_pestanas;
  }
  return ESPACIO_INFERIOR.sin_pestanas;
}

/**
 * Envoltura común de las pantallas: área segura, contenido desplazable y el
 * aviso permanente de la línea 123, siempre visible y al final del contenido.
 */
export function PantallaConAviso({ children, conBarraDePestanas = false }: PantallaConAvisoProps) {
  const alto = espacioInferior(conBarraDePestanas);
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.cuerpo}>{children}</View>
        <AvisoLinea123 />
        <View style={[styles.espacio, { height: alto }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cuerpo: {
    flexGrow: 1,
    gap: 16,
    marginBottom: 16,
  },
  espacio: {
    minHeight: 24,
  },
});
