import { Pressable, StyleSheet, Text } from "react-native";

import { COLOR, RADIO } from "@/components/tema";

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
  primario: { fondo: COLOR.marca, texto: COLOR.blanco, borde: COLOR.marcaOscura },
  secundario: { fondo: COLOR.superficie, texto: COLOR.marca, borde: COLOR.marca },
  peligro: { fondo: COLOR.peligro, texto: COLOR.blanco, borde: "#8E1B13" },
};

const COLORS_DESHABILITADO: ColoresBoton = {
  fondo: "#E7EBF0",
  texto: "#6B7684",
  borde: "#D3DAE3",
};

function coloresDe(variante: VarianteBoton, deshabilitado: boolean): ColoresBoton {
  if (deshabilitado) {
    return COLORS_DESHABILITADO;
  }
  return COLORS[variante];
}

function opacidadDe(presionado: boolean): number {
  if (presionado) {
    return 0.82;
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
    borderRadius: RADIO.md,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  texto: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
