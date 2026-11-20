import type { ViewStyle } from "react-native";

/**
 * Tokens visuales de la app (un solo lugar para colores, espacios y sombras).
 *
 * Los textos se mantienen en español y las claves en inglés, según AGENTS.md.
 * Ningún componente debe inventar colores sueltos: importa de aquí.
 */

export const COLOR = {
  /** Fondo general de las pantallas. */
  fondo: "#F7F9FC",
  /** Tarjetas y superficies elevadas. */
  superficie: "#FFFFFF",
  /** Superficie alternativa (campos, pistas). */
  superficieAlterna: "#F1F5FA",
  borde: "#E1E8F0",
  bordeFuerte: "#CAD5E2",
  texto: "#101B2D",
  textoSuave: "#64748B",
  marca: "#1761D2",
  marcaSuave: "#EDF4FF",
  marcaOscura: "#124AA5",
  peligro: "#D92D2A",
  peligroSuave: "#FFF1F0",
  exito: "#008F69",
  exitoSuave: "#EAFBF5",
  avisoFondo: "#FFF8EB",
  avisoBorde: "#F1D7A7",
  avisoTexto: "#6B4C1E",
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
  sm: 12,
  md: 18,
  lg: 26,
  circulo: 999,
} as const;

/** Sombra suave y consistente para tarjetas (iOS y Android). */
export const SOMBRA_TARJETA: ViewStyle = {
  shadowColor: "#0E1726",
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.035,
  shadowRadius: 18,
  elevation: 1,
};

/** Estilo base de una tarjeta: fondo blanco, borde tenue y esquinas suaves. */
export const ESTILO_TARJETA: ViewStyle = {
  backgroundColor: COLOR.superficie,
  borderColor: COLOR.borde,
  borderRadius: RADIO.md,
  borderWidth: 1,
  ...SOMBRA_TARJETA,
};
