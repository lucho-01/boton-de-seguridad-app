import { StyleSheet, Text, View } from "react-native";

export type TonoEstado = "neutral" | "positivo" | "negativo" | "atencion";

interface EstadoInfoProps {
  /** Texto que describe el estado. */
  mensaje: string;
  /** Color semántico del indicador. */
  tono?: TonoEstado;
  /** Texto alternativo; se usa `mensaje` si se omite. */
  etiquetaAccesible?: string;
}

const COLORS: Record<TonoEstado, { punto: string; fondo: string; borde: string; texto: string }> = {
  neutral: { punto: "#5A6570", fondo: "#F1F3F5", borde: "#C6CBD1", texto: "#1F2933" },
  positivo: { punto: "#1B7F3B", fondo: "#EAF7EE", borde: "#1B7F3B", texto: "#134A24" },
  negativo: { punto: "#B3261E", fondo: "#FDECEA", borde: "#B3261E", texto: "#6B1410" },
  atencion: { punto: "#8A4B00", fondo: "#FFF4E5", borde: "#8A4B00", texto: "#4A2A00" },
};

/** Fila con un punto de color y un mensaje: estado de la API o de la sesión. */
export function EstadoInfo({ mensaje, tono = "neutral", etiquetaAccesible }: EstadoInfoProps) {
  const colores = COLORS[tono];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={etiquetaAccesible ?? mensaje}
      style={[styles.fila, { backgroundColor: colores.fondo, borderColor: colores.borde }]}
    >
      <View style={[styles.punto, { backgroundColor: colores.punto }]} />
      <Text
        allowFontScaling
        maxFontSizeMultiplier={2}
        style={[styles.texto, { color: colores.texto }]}
      >
        {mensaje}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  punto: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  texto: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});
