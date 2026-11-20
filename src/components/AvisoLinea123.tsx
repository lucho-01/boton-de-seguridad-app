import { StyleSheet, Text } from "react-native";

import { COLOR, RADIO } from "@/components/tema";

/** Texto literal exigido por la spec M0 (§5 R7) y por RF-06. */
export const TEXTO_AVISO_123 =
  "Este proyecto es educativo y no reemplaza la línea de emergencias 123.";

/** Aviso permanente: el proyecto es educativo y no reemplaza la línea 123. */
export function AvisoLinea123() {
  return (
    <Text
      accessibilityRole="text"
      accessibilityLabel={TEXTO_AVISO_123}
      allowFontScaling
      maxFontSizeMultiplier={2}
      style={styles.aviso}
    >
      {TEXTO_AVISO_123}
    </Text>
  );
}

const styles = StyleSheet.create({
  aviso: {
    backgroundColor: COLOR.avisoFondo,
    borderColor: COLOR.avisoBorde,
    borderRadius: RADIO.sm,
    borderWidth: 1,
    borderLeftWidth: 4,
    color: COLOR.avisoTexto,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
