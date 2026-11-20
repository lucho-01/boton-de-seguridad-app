import { StyleSheet, Text, View } from "react-native";

import { Parrafo } from "@/components/Parrafo";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { TituloPantalla } from "@/components/TituloPantalla";
import { COLOR, ESPACIO, RADIO, SOMBRA_TARJETA } from "@/components/tema";

/** Pantalla de historial de alertas: llega en M12. */
export default function PantallaHistorial() {
  return (
    <PantallaConAviso conBarraDePestanas>
      <TituloPantalla>Historial</TituloPantalla>
      <View style={styles.tarjeta}>
        <Text allowFontScaling={false} style={styles.glifo}>
          🕘
        </Text>
        <Parrafo>El historial llegará en M12.</Parrafo>
      </View>
    </PantallaConAviso>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    alignItems: "center",
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.md,
    borderWidth: 1,
    gap: ESPACIO.md,
    paddingHorizontal: ESPACIO.lg,
    paddingVertical: ESPACIO.xxl,
    ...SOMBRA_TARJETA,
  },
  glifo: {
    fontSize: 40,
  },
});
