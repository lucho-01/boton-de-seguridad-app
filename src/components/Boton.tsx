import { Pressable, StyleSheet, Text } from "react-native";

export type VarianteBoton = "primario" | "secundario" | "peligro";

interface BotonProps {
  /** Texto visible del botón. */
  texto: string;
  /** Etiqueta para lectores de pantalla; se usa el texto visible si se omite. */
  etiquetaAccesible?: string;
  /** Pista opcional para lectores de pantalla (p. ej. el gesto equivalente). */
  pistaAccesible?: string;
  /** Acción de la persona. */
  onPress: () => void;
  /** Si el botón está deshabilitado mientras hay una operación en curso. */
  deshabilitado?: boolean;
  /** Color semántico del botón. */
  variante?: VarianteBoton;
}

interface ColoresBoton {
  fondo: string;
  texto: string;
  borde: string;
}

const COLORS: Record<VarianteBoton, ColoresBoton> = {
  primario: { fondo: "#0B5FFF", texto: "#FFFFFF", borde: "#0B5FFF" },
  secundario: { fondo: "#FFFFFF", texto: "#0B5FFF", borde: "#0B5FFF" },
  peligro: { fondo: "#B3261E", texto: "#FFFFFF", borde: "#B3261E" },
};

const COLORS_DESHABILITADO: ColoresBoton = { fondo: "#E1E4E8", texto: "#4A5560", borde: "#C6CBD1" };

function coloresDe(variante: VarianteBoton, deshabilitado: boolean): ColoresBoton {
  if (deshabilitado) {
    return COLORS_DESHABILITADO;
  }
  return COLORS[variante];
}

function opacidadDe(presionado: boolean): number {
  if (presionado) {
    return 0.75;
  }
  return 1;
}

/** Botón con objetivo táctil de 44 × 44 mínimo y alternativo a cualquier gesto. */
export function Boton({
  texto,
  etiquetaAccesible,
  pistaAccesible,
  onPress,
  deshabilitado = false,
  variante = "primario",
}: BotonProps) {
  const colores = coloresDe(variante, deshabilitado);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? texto}
      accessibilityHint={pistaAccesible}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colores.fondo,
          borderColor: colores.borde,
          opacity: opacidadDe(pressed),
        },
      ]}
    >
      <Text
        allowFontScaling
        maxFontSizeMultiplier={2}
        style={[styles.texto, { color: colores.texto }]}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  texto: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
});
