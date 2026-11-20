import { StyleSheet, Text, View } from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
  useLongPressGesture,
} from "react-native-gesture-handler";

import { AnilloProgreso } from "@/components/AnilloProgreso";
import { Icono } from "@/components/Icono";
import { COLOR } from "@/components/tema";
import type { EstadoArmado } from "@/controllers";

/** Etiquetas literales del botón SOS (las usan las pruebas de render). */
export const ETIQUETA_BOTON_SOS = "Botón SOS, mantén presionado 3 segundos para armar la alerta";
/** Pista en reposo: el botón alternativo sigue disponible. */
export const PISTA_BOTON_SOS =
  "Si no puedes mantener presionado, usa el botón «Activar con un toque».";
/** Pista durante el armado: la salida es el doble toque sobre el mismo botón. */
export const PISTA_SOS_ARMANDO = "Toca dos veces para cancelar el armado.";
/** Pista durante la cuenta: la salida es el botón «Cancelar la alerta». */
export const PISTA_SOS_CUENTA = "Usa el botón «Cancelar la alerta» para detener la cuenta.";
/** Pista con la alerta lista: la salida es el botón «Volver al inicio». */
export const PISTA_SOS_LISTA = "Usa el botón «Volver al inicio» para volver al reposo.";
/** Texto permanente bajo el botón, en cualquier estado. */
export const TEXTO_PROGRESO_SOS = "Mantén pulsado para activar";
/** Ayuda visible durante la cuenta: los segundos los muestra la cuenta regresiva. */
export const TEXTO_AYUDA_CUENTA = "Usa «Cancelar la alerta» para detener la cuenta.";
/** Ayuda visible con la alerta lista. */
export const TEXTO_AYUDA_LISTA = "Pulsa «Volver al inicio» para volver al reposo.";

interface BotonSosProps {
  estado: EstadoArmado;
  /** Avance de la fase actual entregado por el controlador (0 a 1). */
  progreso: number;
  /** Empieza el conteo de 3 s (onPressIn). */
  onIniciar: () => void;
  /** Suelta antes de tiempo: cancela el conteo (onPressOut). */
  onCancelar: () => void;
}

interface Apariencia {
  fondo: string;
  borde: string;
  leyenda: string;
}

const APARIENCIAS: Record<EstadoArmado, Apariencia> = {
  idle: { fondo: "#D92D2A", borde: "#C42124", leyenda: "Mantén pulsado" },
  arming: { fondo: "#D92D2A", borde: "#B91C22", leyenda: "Mantén pulsado" },
  countdown: { fondo: "#D92D2A", borde: "#B91C22", leyenda: "Cuenta regresiva" },
  lista: { fondo: "#008F69", borde: "#007653", leyenda: "Alerta lista" },
};

const COLOR_TEXTO = "#FFFFFF";

/** Porcentaje entero del armado, entre 0 y 100. */
export function porcentajeArmado(progreso: number): number {
  return Math.round(Math.min(1, Math.max(0, progreso)) * 100);
}

/**
 * Activación por lector de pantalla (doble toque): el gesto no expone la
 * acción `activate`, así que se resuelve aquí. En `idle` arma; en `arming`
 * cancela, para que quien usa lector de pantalla no quede sin salida mientras
 * corre el conteo (observación de seguridad de M2). Durante `countdown` no hace
 * nada: cancelar es tarea del botón «Cancelar la alerta» (R6). No interfiere
 * con el long press, porque `onPressIn`/`onPressOut` vienen del `GestureDetector`.
 */
function accionAccesible(
  estado: EstadoArmado,
  onIniciar: () => void,
  onCancelar: () => void,
): () => void {
  if (estado === "idle") {
    return onIniciar;
  }
  if (estado === "arming") {
    return onCancelar;
  }
  return () => undefined;
}

/**
 * Acciones expuestas a lectores de pantalla. Con `accessibilityActions` el
 * doble toque funciona igual en iOS y en Android (a diferencia de
 * `onAccessibilityTap`, que es solo de iOS); durante la cuenta y en `lista` no
 * hay acción sobre el SOS (spec R6).
 */
function accionesAccesibles(estado: EstadoArmado): { name: string; label: string }[] {
  if (estado === "idle") {
    return [{ name: "activate", label: "Armar la alerta" }];
  }
  if (estado === "arming") {
    return [{ name: "activate", label: "Cancelar el armado" }];
  }
  return [];
}

/** Botón SOS: long press de 3 s con anillo de progreso y su estado visible. */
export function BotonSos({ estado, progreso, onIniciar, onCancelar }: BotonSosProps) {
  const apariencia = APARIENCIAS[estado];
  const porcentaje = porcentajeArmado(progreso);
  const activo = estado === "arming";

  /** Pulsación sin umbral propio: el controlador mide los 3 s (R1). */
  const gestoPulsacion = useLongPressGesture({
    /* Los callbacks corren en el hilo de UI; sin esto, llamar a `onIniciar`
       (JS) lanza «Tried to synchronously call a Remote Function» y cierra la
       app al mantener presionado. */
    runOnJS: true,
    minDuration: 0,
    maxDistance: 80,
    onBegin: () => {
      onIniciar();
    },
    onFinalize: () => {
      onCancelar();
    },
  });

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <View style={styles.bloque}>
        <GestureDetector gesture={gestoPulsacion}>
          <View
            accessibilityRole="button"
            accessibilityLabel={etiquetaDeApariencia(estado)}
            accessibilityHint={pistaDeEstado(estado)}
            accessibilityState={{ busy: activo }}
            accessibilityActions={accionesAccesibles(estado)}
            accessible
            onAccessibilityAction={(evento) => {
              if (evento.nativeEvent.actionName === "activate") {
                accionAccesible(estado, onIniciar, onCancelar)();
              }
            }}
            testID="boton-sos"
            style={styles.zonaTactil}
          >
            <View pointerEvents="none" style={styles.capaAnillo} testID="anillo-sos-superpuesto">
              <AnilloProgreso
                activo={activo}
                color={apariencia.borde}
                colorPista="#F7D8D6"
                tamano={220}
                grosor={8}
              />
            </View>
            <View
              style={[
                styles.circulo,
                { backgroundColor: apariencia.fondo, borderColor: apariencia.borde },
              ]}
            >
              <Icono nombre="escudo" tamano={28} color={COLOR.blanco} grosor={2} />
              <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.titulo}>
                SOS
              </Text>
              <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.leyenda}>
                {apariencia.leyenda}
              </Text>
            </View>
          </View>
        </GestureDetector>
        <Text allowFontScaling maxFontSizeMultiplier={2} style={styles.progresoTexto}>
          {textoDeProgreso(estado, porcentaje)}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

/**
 * Etiqueta accesible del botón: **estable** mientras la fase avanza.
 *
 * No incluye el porcentaje ni los segundos: si cambiara en cada tick, el lector
 * de pantalla podría repetir el anuncio del botón. Los segundos los muestra el
 * texto de la cuenta regresiva y el porcentaje, el texto de progreso. La acción
 * disponible va en la pista, para no repetirla en el mismo anuncio.
 */
function etiquetaDeApariencia(estado: EstadoArmado): string {
  if (estado === "lista") {
    return "Botón SOS. La alerta está lista.";
  }
  if (estado === "countdown") {
    return "Botón SOS. La cuenta regresiva está en marcha.";
  }
  if (estado === "arming") {
    return "Botón SOS. Armando la alerta.";
  }
  return ETIQUETA_BOTON_SOS;
}

/**
 * Pista accesible según el estado: solo sugiere acciones disponibles.
 *
 * En reposo apunta al botón alternativo (activo); en las demás fases ese
 * botón está deshabilitado, así que la pista apunta al botón de cancelar, al
 * de volver al inicio o al doble toque, según corresponda.
 */
function pistaDeEstado(estado: EstadoArmado): string {
  if (estado === "lista") {
    return PISTA_SOS_LISTA;
  }
  if (estado === "countdown") {
    return PISTA_SOS_CUENTA;
  }
  if (estado === "arming") {
    return PISTA_SOS_ARMANDO;
  }
  return PISTA_BOTON_SOS;
}

/**
 * Texto del progreso: fijo en cada estado, con el porcentaje en `arming`.
 *
 * Durante la cuenta no repite «Alerta en X s» (lo muestra la cuenta
 * regresiva): evita textos duplicados en el árbol accesible.
 */
function textoDeProgreso(estado: EstadoArmado, porcentaje: number): string {
  if (estado === "arming") {
    return `Suelta para cancelar · ${porcentaje}%`;
  }
  if (estado === "countdown") {
    return TEXTO_AYUDA_CUENTA;
  }
  if (estado === "lista") {
    return "Alerta preparada";
  }
  return TEXTO_PROGRESO_SOS;
}

const LADO_CIRCULO = 196;

const styles = StyleSheet.create({
  raiz: {
    alignSelf: "center",
  },
  bloque: {
    alignItems: "center",
    gap: 4,
  },
  zonaTactil: {
    alignItems: "center",
    height: 232,
    justifyContent: "center",
    position: "relative",
    width: 232,
  },
  capaAnillo: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  circulo: {
    alignItems: "center",
    borderRadius: LADO_CIRCULO / 2,
    borderWidth: 2,
    elevation: 4,
    gap: 4,
    height: LADO_CIRCULO,
    justifyContent: "center",
    shadowColor: "#D92D2A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    width: LADO_CIRCULO,
  },
  titulo: {
    color: COLOR_TEXTO,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  leyenda: {
    color: COLOR_TEXTO,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
    opacity: 0.95,
    textAlign: "center",
  },
  progresoTexto: {
    color: COLOR.textoSuave,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
