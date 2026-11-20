import { StyleSheet, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnilloProgreso } from "@/components/AnilloProgreso";
import { Boton } from "@/components/Boton";
import { MS_CUENTA } from "@/services/cuentaRegresiva";

/** Distancia que hay que deslizar para cancelar (spec R4). */
export const UMBRAL_CANCELAR = 96;
/** Etiqueta accesible del botón alternativo al gesto. */
export const ETIQUETA_CANCELAR = "Cancelar la alerta";
/**
 * Pista accesible del botón: describe su propia acción.
 *
 * No menciona el deslizamiento: el control de deslizar no es alcanzable con
 * lector de pantalla, así que esa pista quedaba muerta (no había acción que
 * ejecutar). El botón es la alternativa accesible real.
 */
export const PISTA_CANCELAR = "Detiene la cuenta regresiva y vuelve al reposo.";
/** Texto visible del control de deslizamiento. */
export const TEXTO_DESLIZAR =
  "Desliza para cancelar"; /** Recorrido máximo del control dentro de su pista, en puntos. */
const LIMITE_DESLIZAMIENTO = 150;

/** Texto de estado de la cuenta: única fuente de «Alerta en X s». */
export function textoCuenta(restanteSegundos: number): string {
  return `Alerta en ${restanteSegundos} s`;
}

interface CuentaRegresivaProps {
  /** Segundos que faltan, de 5 a 0 (spec R2). */
  restanteSegundos: number;
  /** Cancela la cuenta (gesto o botón, mismo resultado). */
  onCancelar: () => void;
}

/** Cuenta regresiva de 5 s: número, anillo, deslizamiento y botón alternativo. */
export function CuentaRegresiva({ restanteSegundos, onCancelar }: CuentaRegresivaProps) {
  const desplazamiento = useSharedValue(0);

  /** Pan horizontal: sigue la pista y cancela al superar el umbral (R4). */
  const gesto = usePanGesture({
    runOnJS: true,
    activeOffsetX: 10,
    failOffsetY: 24,
    onUpdate: (evento) => {
      desplazamiento.value = Math.max(0, Math.min(LIMITE_DESLIZAMIENTO, evento.translationX));
    },
    onDeactivate: (evento) => {
      const superado = evento.translationX >= UMBRAL_CANCELAR;
      desplazamiento.value = withTiming(0, { duration: 120 });
      if (superado) {
        onCancelar();
      }
    },
  });

  const estiloControl = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento.value }],
  }));

  return (
    <View style={styles.bloque}>
      <View style={styles.rueda}>
        <AnilloProgreso activo color="#B3261E" duracionMs={MS_CUENTA} tamano={220} />
        <View pointerEvents="none" style={styles.numeroEncima}>
          <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.numero}>
            {restanteSegundos}
          </Text>
        </View>
      </View>
      {/* Sin live region: la voz solo anuncia el inicio y la cancelación (spec §3). */}
      <Text allowFontScaling maxFontSizeMultiplier={2} style={styles.texto}>
        {textoCuenta(restanteSegundos)}
      </Text>
      <GestureDetector gesture={gesto}>
        {/* El gesto es solo visual: se oculta el bloque entero, con sus textos
            descendientes, para que el lector de pantalla no anuncie «Desliza para
            cancelar» (un gesto que no puede ejecutar). La alternativa real es el
            botón «Cancelar la alerta». */}
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.pista}
          testID="deslizar-cancelar"
        >
          <Animated.View style={[styles.control, estiloControl]}>
            <Text allowFontScaling maxFontSizeMultiplier={2} style={styles.flecha}>
              →→
            </Text>
          </Animated.View>
          <Text allowFontScaling maxFontSizeMultiplier={2} style={styles.textoPista}>
            {TEXTO_DESLIZAR}
          </Text>
        </View>
      </GestureDetector>
      <Boton
        etiquetaAccesible={ETIQUETA_CANCELAR}
        onPress={onCancelar}
        pistaAccesible={PISTA_CANCELAR}
        texto="Cancelar la alerta"
        variante="secundario"
      />
    </View>
  );
}

const LADO_RUEDA = 220;

const styles = StyleSheet.create({
  bloque: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  rueda: {
    alignItems: "center",
    height: LADO_RUEDA,
    justifyContent: "center",
    width: LADO_RUEDA,
  },
  numeroEncima: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  numero: {
    color: "#1F2933",
    fontSize: 72,
    fontWeight: "800",
  },
  texto: {
    color: "#1F2933",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  pista: {
    alignItems: "center",
    backgroundColor: "#E1E4E8",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  control: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    left: 4,
    position: "absolute",
    top: 4,
    width: 48,
  },
  flecha: {
    color: "#0B5FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  textoPista: {
    color: "#4A5560",
    fontSize: 16,
    position: "absolute",
  },
});
