import { Alert, StyleSheet, Text, View } from "react-native";

import { Boton } from "@/components/Boton";
import { EstadoInfo } from "@/components/EstadoInfo";

interface BloqueSesionProps {
  /** Correo de la sesión activa; `null` cuando no hay nadie autenticado. */
  email: string | null;
  /** Si el proveedor todavía está restaurando la sesión guardada. */
  iniciando: boolean;
  /** Cierra la sesión (borra tokens y avisa al proveedor). */
  onCerrar: () => void;
}

function preguntarCierre(onCerrar: () => void) {
  Alert.alert("Cerrar sesión", "Se borrará la sesión guardada en este dispositivo. ¿Continuar?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Cerrar sesión", style: "destructive", onPress: onCerrar },
  ]);
}

function TextoCierre({ onCerrar }: { onCerrar: () => void }) {
  return (
    <Boton
      texto="Cerrar sesión"
      etiquetaAccesible="Cerrar sesión"
      onPress={() => {
        preguntarCierre(onCerrar);
      }}
      variante="peligro"
    />
  );
}

/** Estado de la sesión (nunca muestra tokens) y botón de cierre con confirmación. */
export function BloqueSesion({ email, iniciando, onCerrar }: BloqueSesionProps) {
  return (
    <View style={styles.bloque}>
      <Text
        accessibilityRole="header"
        allowFontScaling
        maxFontSizeMultiplier={2}
        style={styles.etiqueta}
      >
        Sesión:
      </Text>
      <View accessibilityLiveRegion="polite" accessibilityRole="summary">
        <ContenidoSesion email={email} iniciando={iniciando} />
      </View>
      <CierreSesion email={email} iniciando={iniciando} onCerrar={onCerrar} />
    </View>
  );
}

function ContenidoSesion({ email, iniciando }: { email: string | null; iniciando: boolean }) {
  if (email !== null) {
    return (
      <EstadoInfo
        mensaje={email}
        tono="positivo"
        etiquetaAccesible={`Sesión iniciada como ${email}`}
      />
    );
  }
  if (iniciando) {
    return <EstadoInfo mensaje="Restaurando la sesión…" tono="neutral" />;
  }
  return (
    <EstadoInfo
      mensaje="Sin iniciar sesión"
      tono="neutral"
      etiquetaAccesible="Sesión sin iniciar"
    />
  );
}

function CierreSesion({
  email,
  iniciando,
  onCerrar,
}: {
  email: string | null;
  iniciando: boolean;
  onCerrar: () => void;
}) {
  if (email === null) {
    return null;
  }
  if (iniciando) {
    return null;
  }
  return <TextoCierre onCerrar={onCerrar} />;
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
