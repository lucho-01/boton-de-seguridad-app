import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AvisoLinea123 } from "@/components/AvisoLinea123";
import { ESPACIO, COLOR } from "@/components/tema";

interface PantallaConAvisoProps {
  /** Contenido propio de la pantalla. */
  children: ReactNode;
  /** Si la pantalla ya lleva barra de pestañas abajo, no se reserva otro margen. */
  conBarraDePestanas?: boolean;
}

function espacioDelAviso(conBarraDePestanas: boolean, insetInferior: number): number {
  if (conBarraDePestanas) {
    return ESPACIO.sm;
  }
  return Math.max(9, insetInferior);
}

/**
 * Envoltura común de las pantallas: área segura, contenido desplazable y el
 * aviso permanente de la línea 123 siempre visible sobre la navegación.
 */
export function PantallaConAviso({ children, conBarraDePestanas = false }: PantallaConAvisoProps) {
  const insets = useSafeAreaInsets();
  const espacioScroll = 112 + insets.bottom;
  const espacioAviso = espacioDelAviso(conBarraDePestanas, insets.bottom);
  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.contenedor}>
        <ScrollView
          contentContainerStyle={[styles.contenido, { paddingBottom: espacioScroll }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cuerpo}>{children}</View>
        </ScrollView>
        <View style={[styles.pie, { paddingBottom: espacioAviso }]}>
          <AvisoLinea123 />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLOR.fondo,
    flex: 1,
  },
  contenedor: {
    flex: 1,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: ESPACIO.lg,
    paddingTop: ESPACIO.xxl,
  },
  cuerpo: {
    flexGrow: 1,
    gap: ESPACIO.md,
    marginBottom: ESPACIO.lg,
  },
  pie: {
    backgroundColor: COLOR.fondo,
    paddingHorizontal: ESPACIO.lg,
    paddingTop: ESPACIO.xs,
  },
});
