import type { ViewStyle } from "react-native";

/**
 * Tokens visuales de la app (un solo lugar para colores, espacios y sombras).
 *
 * Los textos se mantienen en español y las claves en inglés, según AGENTS.md.
 * Ningún componente debe inventar colores sueltos: importa de aquí.
 */

export const COLOR = {
  /** Fondo general de las pantallas. */
  fondo: "#F1F4F8",
  /** Tarjetas y superficies elevadas. */
  superficie: "#FFFFFF",
  /** Superficie alternativa (campos, pistas). */
  superficieAlterna: "#F7F9FC",
  borde: "#DCE2EA",
  bordeFuerte: "#C2CBD6",
  texto: "#0E1726",
  textoSuave: "#55606E",
  marca: "#0B5FFF",
  marcaSuave: "#E8F0FF",
  marcaOscura: "#0846BF",
  peligro: "#C0271C",
  peligroSuave: "#FCEBE9",
  exito: "#12703A",
  exitoSuave: "#E7F5EC",
  avisoFondo: "#FFF6E8",
  avisoBorde: "#B45309",
  avisoTexto: "#6B3A00",
  blanco: "#FFFFFF",
} as const;

export const ESPACIO = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIO = {
  sm: 10,
  md: 14,
  lg: 20,
  circulo: 999,
} as const;

/** Sombra suave y consistente para tarjetas (iOS y Android). */
export const SOMBRA_TARJETA: ViewStyle = {
  shadowColor: "#0E1726",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 2,
};

/** Estilo base de una tarjeta: fondo blanco, borde tenue y esquinas suaves. */
export const ESTILO_TARJETA: ViewStyle = {
  backgroundColor: COLOR.superficie,
  borderColor: COLOR.borde,
  borderRadius: RADIO.md,
  borderWidth: 1,
  ...SOMBRA_TARJETA,
};
