import { StyleSheet, Text, View } from "react-native";

import { Boton } from "@/components/Boton";
import { EstadoInfo, type TonoEstado } from "@/components/EstadoInfo";

export type EstadoApi = "sin_comprobar" | "conectado" | "sin_conexion" | "error";

interface EstadoApiView {
  texto: string;
  tono: TonoEstado;
}

const ESTADOS_API: Record<EstadoApi, EstadoApiView> = {
  sin_comprobar: { texto: "Sin comprobar", tono: "neutral" },
  conectado: { texto: "Conectado", tono: "positivo" },
  sin_conexion: { texto: "Sin conexión", tono: "negativo" },
  error: { texto: "Error de servidor", tono: "atencion" },
};

interface BloqueEstadoApiProps {
  /** Estado que reporta el controlador de sesión. */
  estado: EstadoApi;
  /** Si hay una comprobación en curso. */
  comprobando: boolean;
  /** Lanza la comprobación de `GET /api/health`. */
  onComprobar: () => void;
}

/** Estado de la API con su botón de comprobación. */
export function BloqueEstadoApi({ estado, comprobando, onComprobar }: BloqueEstadoApiProps) {
  const vista = ESTADOS_API[estado];
  return (
    <View style={styles.bloque}>
      <Text
        accessibilityRole="header"
        allowFontScaling
        maxFontSizeMultiplier={2}
        style={styles.etiqueta}
      >
        Estado del servidor:
      </Text>
      <View accessibilityLiveRegion="polite" accessibilityRole="summary">
        <EstadoInfo
          mensaje={vista.texto}
          tono={vista.tono}
          etiquetaAccesible={`Servidor: ${vista.texto}`}
        />
      </View>
      <Boton
        texto="Comprobar conexión"
        etiquetaAccesible="Comprobar la conexión con el servidor"
        onPress={onComprobar}
        deshabilitado={comprobando}
        variante="secundario"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    gap: 10,
  },
  etiqueta: {
    color: "#11181C",
    fontSize: 18,
    fontWeight: "600",
  },
});
