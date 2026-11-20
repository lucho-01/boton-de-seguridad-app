import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Boton } from "@/components/Boton";
import { Parrafo } from "@/components/Parrafo";
import type { EstadoArmado } from "@/controllers";
import type { Ubicacion } from "@/sensors/useUbicacion";

interface SmsVista {
  disponible: boolean;
  mensaje: string;
  longitudMensaje: number;
  tieneUbicacion: boolean;
  puedeAbrir: boolean;
  puedeCopiar: boolean;
  aviso: string | null;
  avisoCopia: string | null;
  abrirRedactor(): Promise<boolean>;
  copiarMensaje(): Promise<boolean>;
}

/** Texto de reposo de la pantalla. */
export const TEXTO_REPOSO = "Mantén presionado 3 segundos. También puedes usar el botón de abajo.";
/** Texto del final de la cuenta en M3 (spec R8). */
export const TEXTO_CUENTA_TERMINADA = "Cuenta terminada.";
/** Etiqueta del botón que vuelve al inicio desde `lista`. */
export const ETIQUETA_VOLVER = "Volver al inicio";
/** Texto cuando se obtiene la ubicación (M8). */
export const TEXTO_UBICACION_OBTENIDA = "Ubicación obtenida.";
/** Texto cuando no se pudo obtener la ubicación (M8). */
export const TEXTO_UBICACION_NO_DISPONIBLE = "Ubicación no disponible.";

/** Texto de las coordenadas (M8). */
function textoCoordenadas(ubicacion: Ubicacion): string {
  return `Latitud: ${ubicacion.latitud}, Longitud: ${ubicacion.longitud}`;
}

/** Texto de la precisión (M8). */
function textoPrecision(ubicacion: Ubicacion): string {
  return `Precisión: ${ubicacion.precision} m`;
}

/** Bloque con la ubicación obtenida (M8). */
function BloqueUbicacionObtenida(ubicacion: Ubicacion): ReactNode {
  return (
    <View style={styles.bloque}>
      <Parrafo>{TEXTO_UBICACION_OBTENIDA}</Parrafo>
      <Parrafo>{textoCoordenadas(ubicacion)}</Parrafo>
      <Parrafo>{textoPrecision(ubicacion)}</Parrafo>
    </View>
  );
}

/** Bloque cuando no se pudo obtener la ubicación (M8). */
function BloqueUbicacionNoDisponible(): ReactNode {
  return (
    <View style={styles.bloque}>
      <Parrafo>{TEXTO_UBICACION_NO_DISPONIBLE}</Parrafo>
    </View>
  );
}

/** Renderiza el bloque de ubicación según si hay coordenadas (sin ternarios). */
function renderUbicacion(ubicacion: Ubicacion | null, fallida: boolean): ReactNode {
  if (ubicacion !== null) {
    return BloqueUbicacionObtenida(ubicacion);
  }
  if (fallida) {
    return BloqueUbicacionNoDisponible();
  }
  return null;
}

interface ContenidoArmadoProps {
  estado: EstadoArmado;
  /** Vuelve de `lista` a `idle`. */
  onVolverAlInicio: () => void;
  /** Ubicación obtenida al terminar la cuenta (M8). */
  ubicacion: Ubicacion | null;
  /** Si se intentó obtener ubicación y no se pudo (M8). */
  ubicacionFallida: boolean;
  /** Mensaje, avisos y acción del redactor SMS (M10). */
  sms?: SmsVista;
}

const SMS_FALLBACK: SmsVista = {
  disponible: false,
  mensaje: "",
  longitudMensaje: 0,
  tieneUbicacion: false,
  puedeAbrir: false,
  puedeCopiar: false,
  aviso: "El SMS no está disponible en este dispositivo.",
  avisoCopia: null,
  abrirRedactor: async () => false,
  copiarMensaje: async () => false,
};

/** Contenido de la pantalla que cambia con el estado del flujo. */
export function ContenidoArmado({
  estado,
  onVolverAlInicio,
  ubicacion,
  ubicacionFallida,
  sms,
}: ContenidoArmadoProps) {
  let smsContenido = SMS_FALLBACK;
  if (sms !== undefined) {
    smsContenido = sms;
  }
  if (estado === "lista") {
    return (
      <ContenidoLista
        onVolverAlInicio={onVolverAlInicio}
        ubicacion={ubicacion}
        ubicacionFallida={ubicacionFallida}
        sms={smsContenido}
      />
    );
  }
  if (estado === "arming") {
    return <ContenidoArmando />;
  }
  if (estado === "countdown") {
    return <ContenidoCuenta />;
  }
  return <ContenidoReposo />;
}

function ContenidoReposo() {
  return (
    <View style={styles.bloque}>
      <Parrafo>{TEXTO_REPOSO}</Parrafo>
    </View>
  );
}

/**
 * Bloque del armado.
 *
 * **Sin live region y sin porcentaje:** el avance ya se lee en «Mantén presionado:
 * X %», el texto de progreso del botón SOS (única fuente del dato). Aquí solo
 * va el estado, para no repetirlo en el árbol accesible.
 */
function ContenidoArmando() {
  return (
    <View accessibilityRole="summary" style={styles.bloque}>
      <Parrafo>Armando alerta…</Parrafo>
    </View>
  );
}

/**
 * Bloque de la cuenta.
 *
 * **Sin live region:** el inicio de la cuenta ya lo anuncia el controlador
 * («Cuenta regresiva iniciada»); repetirlo aquí duplicaría el aviso.
 */
function ContenidoCuenta() {
  return (
    <View accessibilityRole="summary" style={styles.bloque}>
      <Parrafo>Puedes cancelar la alerta deslizando o con el botón.</Parrafo>
    </View>
  );
}

/**
 * Bloque final de la cuenta.
 *
 * La live region queda solo en el párrafo: así se anuncia «Cuenta terminada»
 * una vez y el botón «Volver al inicio» no se lee con él.
 */
function ContenidoLista({
  onVolverAlInicio,
  ubicacion,
  ubicacionFallida,
  sms,
}: {
  onVolverAlInicio: () => void;
  ubicacion: Ubicacion | null;
  ubicacionFallida: boolean;
  sms: SmsVista;
}) {
  return (
    <View style={styles.bloque}>
      <View accessibilityLiveRegion="polite" accessibilityRole="summary">
        <Parrafo>{TEXTO_CUENTA_TERMINADA}</Parrafo>
      </View>
      {renderUbicacion(ubicacion, ubicacionFallida)}
      <VistaMensajeSms sms={sms} />
      <Boton
        texto="Volver al inicio"
        etiquetaAccesible={ETIQUETA_VOLVER}
        onPress={onVolverAlInicio}
        variante="secundario"
      />
    </View>
  );
}

/** Vista previa y acción explícita del SMS en el estado final. */
function VistaMensajeSms({ sms }: { sms: SmsVista }) {
  return (
    <View style={styles.bloque}>
      <Parrafo>Mensaje para enviar:</Parrafo>
      <View accessibilityRole="summary" style={styles.vistaMensaje}>
        <Parrafo>{sms.mensaje}</Parrafo>
      </View>
      <Parrafo>{sms.longitudMensaje} / 160 caracteres</Parrafo>
      {sms.aviso !== null && <Parrafo>{sms.aviso}</Parrafo>}
      {sms.avisoCopia !== null && <Parrafo>{sms.avisoCopia}</Parrafo>}
      <Boton
        texto="Abrir mensaje para enviar"
        etiquetaAccesible="Abrir mensaje para enviar"
        pistaAccesible="Abre el redactor del teléfono. Debes pulsar Enviar manualmente."
        onPress={() => {
          void sms.abrirRedactor();
        }}
        deshabilitado={!sms.puedeAbrir}
      />
      {botonCopiar(sms)}
    </View>
  );
}

function botonCopiar(sms: SmsVista): ReactNode {
  if (!sms.puedeCopiar) {
    return null;
  }
  return (
    <Boton
      texto="Copiar mensaje"
      etiquetaAccesible="Copiar mensaje de alerta"
      pistaAccesible="Copia el texto para que puedas pegarlo en otra aplicación."
      onPress={() => {
        void sms.copiarMensaje();
      }}
      variante="secundario"
    />
  );
}

const styles = StyleSheet.create({
  bloque: {
    gap: 12,
  },
  vistaMensaje: {
    borderColor: "#D0D5DD",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
});
