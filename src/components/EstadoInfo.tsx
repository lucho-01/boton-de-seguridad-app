import { StyleSheet, Text, View } from "react-native";
import { COLOR } from "@/components/tema";

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
  neutral: {
    punto: COLOR.textoSuave,
    fondo: COLOR.superficieAlterna,
    borde: COLOR.borde,
    texto: COLOR.texto,
  },
  positivo: {
    punto: COLOR.exito,
    fondo: COLOR.exitoSuave,
    borde: COLOR.exitoSuave,
    texto: COLOR.exito,
  },
  negativo: {
    punto: COLOR.peligro,
    fondo: COLOR.peligroSuave,
    borde: COLOR.peligroSuave,
    texto: COLOR.peligro,
  },
  atencion: {
    punto: "#A66D13",
    fondo: COLOR.avisoFondo,
    borde: COLOR.avisoBorde,
    texto: COLOR.avisoTexto,
  },
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
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  punto: {
    borderRadius: 7,
    height: 8,
    width: 8,
  },
  texto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
