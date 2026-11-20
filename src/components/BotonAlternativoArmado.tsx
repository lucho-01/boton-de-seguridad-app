import { Pressable, StyleSheet, Text, View } from "react-native";

/** Texto literal del botón alternativo y de su pista (los usan las pruebas). */
export const TEXTO_BOTON_ALTERNATIVO = "Armar la alerta con un botón";
export const ETIQUETA_BOTON_ALTERNATIVO = "Armar la alerta con un botón (mantén presionado)";
export const PISTA_BOTON_ALTERNATIVO =
  "Alternativa al gesto de mantener presionado: una sola pulsación arma la alerta.";
export const PISTA_ALTERNATIVA_VISIBLE = "Alternativa accesible al gesto de mantener presionado.";
interface BotonAlternativoArmadoProps {
  /** Arma la alerta con una sola pulsación (R6). */
  onArmar: () => void;
  /** Se deshabilita mientras no sea posible armar (estado distinto de `idle`). */
  disponible: boolean;
}

/** Botón equivalente al long press para quien no puede sostener el dedo. */
export function BotonAlternativoArmado({ onArmar, disponible }: BotonAlternativoArmadoProps) {
  return (
    <View style={styles.bloque}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiquetaAlternativa(disponible)}
        accessibilityHint={pistaDeDisponibilidad(disponible)}
        accessibilityState={{ disabled: !disponible }}
        disabled={!disponible}
        hitSlop={8}
        onPress={onArmar}
        style={estiloBoton(disponible)}
        testID="boton-armar-alternativo"
      >
        <Text allowFontScaling maxFontSizeMultiplier={2} style={estiloTexto(disponible)}>
          {TEXTO_BOTON_ALTERNATIVO}
        </Text>
      </Pressable>
      <Text allowFontScaling maxFontSizeMultiplier={2} style={styles.pista}>
        {PISTA_ALTERNATIVA_VISIBLE}
      </Text>
    </View>
  );
}

/** Etiqueta accesible del botón alternativo (sin ternarios). */
function etiquetaAlternativa(disponible: boolean): string {
  if (disponible) {
    return ETIQUETA_BOTON_ALTERNATIVO;
  }
  return `${ETIQUETA_BOTON_ALTERNATIVO}. No disponible ahora.`;
}

/**
 * Pista del botón alternativo: solo si el botón está disponible.
 *
 * Deshabilitado, la etiqueta ya dice «No disponible ahora»; mantener la pista
 * «una sola pulsación arma la alerta» sería una pista muerta (anuncia una
 * acción que no se puede ejecutar).
 */
function pistaDeDisponibilidad(disponible: boolean): string | undefined {
  if (disponible) {
    return PISTA_BOTON_ALTERNATIVO;
  }
  return undefined;
}

/** Estilo del botón según su disponibilidad (sin ternarios). */
function estiloBoton(disponible: boolean) {
  if (disponible) {
    return [styles.boton, styles.botonDisponible];
  }
  return [styles.boton, styles.botonApagado];
}

/** Color del texto según su disponibilidad (sin ternarios). */
function estiloTexto(disponible: boolean) {
  if (disponible) {
    return [styles.texto, styles.textoDisponible];
  }
  return [styles.texto, styles.textoApagado];
}

const styles = StyleSheet.create({
  bloque: {
    gap: 6,
  },
  boton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  botonDisponible: {
    backgroundColor: "#FFFFFF",
    borderColor: "#0B5FFF",
  },
  botonApagado: {
    backgroundColor: "#E1E4E8",
    borderColor: "#C6CBD1",
  },
  texto: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  textoDisponible: {
    color: "#0B5FFF",
  },
  textoApagado: {
    color: "#4A5560",
  },
  pista: {
    color: "#4A5560",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
});
