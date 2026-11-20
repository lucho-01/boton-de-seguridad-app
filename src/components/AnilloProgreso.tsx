import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { MS_ARMADO } from "@/services/armadoSos";

/**
 * Duración del recorrido completo del anillo: la misma que el umbral de armado
 * (R1), importada del servicio para que anillo y estado no se desincronicen.
 */
export const DURACION_ANILLO_MS = MS_ARMADO;
/** Duración del retorno a cero al soltar o cancelar. */
const DURACION_RETORNO_MS = 150;
/** Cada media luna cubre la mitad del recorrido: la segunda empieza en el 50 %. */
const OFFSET_MEDIA_VUELTA = 0.5;

interface AnilloProgresoProps {
  /** `true` mientras la fase activa avanza; al desactivarse vuelve a 0. */
  activo: boolean;
  /** Duración del recorrido completo; por defecto, el umbral de armado (M2). */
  duracionMs?: number;
  /** Diámetro exterior del anillo en puntos. */
  tamano?: number;
  /** Grosor del trazo en puntos. */
  grosor?: number;
  /** Color del arco ya recorrido. */
  color?: string;
  /** Color de la pista (el anillo completo en reposo). */
  colorPista?: string;
}

/**
 * Anillo de progreso sin SVG: dos medias lunas superpuestas. La primera cubre
 * del 0 al 50 % y la segunda del 50 al 100 %, así que juntas dibujan el arco
 * mientras la pulsación esté activa.
 */
export function AnilloProgreso({
  activo,
  duracionMs = DURACION_ANILLO_MS,
  tamano = 268,
  grosor = 10,
  color = "#B3261E",
  colorPista = "#F3C7C3",
}: AnilloProgresoProps) {
  const avance = useSharedValue(0);

  useEffect(() => {
    if (activo) {
      avance.value = 0;
      avance.value = withTiming(1, { duration: duracionMs, easing: Easing.linear });
      return;
    }
    avance.value = withTiming(0, { duration: DURACION_RETORNO_MS });
  }, [activo, avance, duracionMs]);

  const medidas = { tamano, grosor };
  return (
    <View
      pointerEvents="none"
      testID="anillo-progreso"
      style={[
        styles.contenedor,
        {
          borderRadius: tamano / 2,
          borderWidth: grosor,
          borderColor: colorPista,
          height: tamano,
          width: tamano,
        },
      ]}
    >
      <MediaLuna capa="primera" avance={avance} color={color} medidas={medidas} />
      <MediaLuna capa="segunda" avance={avance} color={color} medidas={medidas} />
    </View>
  );
}

interface Medidas {
  tamano: number;
  grosor: number;
}

interface MediaLunaProps {
  /** `primera` llena del 0 al 50 %; `segunda` del 50 al 100 %. */
  capa: "primera" | "segunda";
  avance: SharedValue<number>;
  color: string;
  medidas: Medidas;
}

/** Media luna que se destapa con una máscara circular y gira con el avance. */
function MediaLuna({ capa, avance, color, medidas }: MediaLunaProps) {
  const { tamano, grosor } = medidas;
  const offset = offsetDeCapa(capa);
  const estiloArco = useAnimatedStyle(() => {
    /* El recorte va en línea: dentro de un worklet no se puede llamar a una
       función de JavaScript normal (provoca «synchronously call a Remote
       Function»). `Math.min`/`Math.max` sí están disponibles en el hilo de UI. */
    const sinRecortar = avance.value * 2 - offset;
    const visible = Math.min(1, Math.max(0, sinRecortar));
    return {
      opacity: visible,
      transform: [{ rotate: `${offset * Math.PI + avance.value * Math.PI}rad` }],
    };
  });

  return (
    <Animated.View style={[styles.capa, { height: tamano, width: tamano }, estiloArco]}>
      <View
        style={[styles.mascara, { borderRadius: tamano / 2, height: tamano / 2, width: tamano }]}
      >
        <View
          style={[
            styles.arco,
            {
              borderBottomColor: color,
              borderBottomWidth: grosor,
              borderLeftColor: color,
              borderLeftWidth: grosor,
              borderRightWidth: grosor,
              borderTopWidth: grosor,
              borderBottomLeftRadius: tamano / 2,
              height: tamano / 2,
              width: tamano,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

/** Punto de partida de cada media luna dentro del recorrido 0 → 1. */
function offsetDeCapa(capa: "primera" | "segunda"): number {
  if (capa === "primera") {
    return 0;
  }
  return OFFSET_MEDIA_VUELTA;
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: "center",
    justifyContent: "center",
  },
  capa: {
    left: 0,
    position: "absolute",
    top: 0,
  },
  mascara: {
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
  },
  arco: {
    borderRightColor: "transparent",
    borderTopColor: "transparent",
    left: 0,
    position: "absolute",
    top: 0,
  },
});
