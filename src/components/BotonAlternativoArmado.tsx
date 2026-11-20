import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icono } from "@/components/Icono";
import { COLOR, RADIO } from "@/components/tema";

/** Texto literal del botón alternativo y de su pista (los usan las pruebas). */
export const TEXTO_BOTON_ALTERNATIVO = "Activar con un toque";
export const ETIQUETA_BOTON_ALTERNATIVO = "Activar la alerta con un toque";
export const PISTA_BOTON_ALTERNATIVO =
  "Alternativa accesible al gesto de mantener presionado. Activa la cuenta de seguridad.";
export const PISTA_ALTERNATIVA_VISIBLE = "Alternativa accesible";
interface BotonAlternativoArmadoProps {
  /** Arma la alerta con una sola pulsación (R6). */
  onArmar: () => void;
  /** Se deshabilita mientras no sea posible armar (estado distinto de `idle`). */
  disponible: boolean;
}

/** Botón equivalente al long press para quien no puede sostener el dedo. */
export function BotonAlternativoArmado({ onArmar, disponible }: BotonAlternativoArmadoProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAlternativa(disponible)}
      accessibilityHint={pistaDeDisponibilidad(disponible)}
      accessibilityState={{ disabled: !disponible }}
      disabled={!disponible}
      onPress={onArmar}
      style={({ pressed }) => [estiloBoton(disponible), pressed && styles.presionado]}
      testID="boton-armar-alternativo"
    >
      <View style={styles.icono}>
        <Icono nombre="telefono" tamano={20} color={COLOR.marca} />
      </View>
      <View style={styles.textos}>
        <Text allowFontScaling maxFontSizeMultiplier={1.5} style={estilos.texto}>
          {TEXTO_BOTON_ALTERNATIVO}
        </Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.5} style={estilos.pista}>
          {PISTA_ALTERNATIVA_VISIBLE}
        </Text>
      </View>
      <Icono nombre="flecha" tamano={20} color={COLOR.textoSuave} />
    </Pressable>
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

const styles = StyleSheet.create({
  boton: {
    alignItems: "center",
    borderRadius: RADIO.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 74,
    paddingHorizontal: 13,
    width: "100%",
  },
  botonDisponible: {
    backgroundColor: COLOR.superficie,
    borderColor: "#D8E6FF",
  },
  botonApagado: {
    backgroundColor: COLOR.superficieAlterna,
    borderColor: COLOR.borde,
  },
  icono: {
    alignItems: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  presionado: {
    opacity: 0.78,
  },
});

const estilos = StyleSheet.create({
  texto: {
    color: COLOR.texto,
    fontSize: 15,
    fontWeight: "700",
  },
  pista: {
    color: COLOR.textoSuave,
    fontSize: 12,
  },
});
