import { Link, Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { COLOR, ESPACIO, RADIO } from "@/components/tema";

/** Iconos de las pestañas: emoji del sistema (sin dependencias nuevas). */
const ICONO_ALERTA = "🚨";
const ICONO_CONTACTOS = "👥";
const ICONO_HISTORIAL = "🕘";

function estiloBotonAjustes({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> {
  if (pressed) {
    return [styles.botonAjustes, styles.presionado];
  }
  return styles.botonAjustes;
}

/** Botón del header que abre «Ajustes» (alternativa accesible a cualquier gesto). */
function BotonAjustes() {
  return (
    <Link href="/ajustes" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir ajustes"
        accessibilityHint="Muestra el estado del servidor y de la sesión"
        hitSlop={8}
        style={estiloBotonAjustes}
      >
        <Text allowFontScaling maxFontSizeMultiplier={2} style={styles.textoAjustes}>
          Ajustes
        </Text>
      </Pressable>
    </Link>
  );
}

/** Estilo del icono según la pestaña activa (sin ternarios). */
function estiloIcono(activo: boolean) {
  if (activo) {
    return [styles.icono, styles.iconoActivo];
  }
  return [styles.icono, styles.iconoInactivo];
}

/** Icono de pestaña: decorativo, el nombre accesible va en `tabBarLabel`. */
function IconoPestana({ glifo, activo }: { glifo: string; activo: boolean }) {
  return (
    <Text
      accessibilityElementsHidden
      allowFontScaling={false}
      importantForAccessibility="no-hide-descendants"
      style={estiloIcono(activo)}
    >
      {glifo}
    </Text>
  );
}

/** Pestañas del producto: alerta, contactos e historial, con acceso a ajustes. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLOR.marca,
        tabBarInactiveTintColor: COLOR.textoSuave,
        tabBarLabelStyle: styles.etiquetaPestana,
        tabBarAllowFontScaling: true,
        tabBarStyle: styles.barraPestanas,
        tabBarItemStyle: styles.itemPestana,
        sceneStyle: styles.escena,
        headerStyle: styles.encabezado,
        headerTitleStyle: styles.tituloEncabezado,
        headerShadowVisible: false,
        headerRight: BotonAjustes,
        headerRightContainerStyle: styles.zonaBotonHeader,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Alerta",
          tabBarLabel: "Alerta",
          tabBarAccessibilityLabel: "Alerta",
          tabBarIcon: ({ focused }) => <IconoPestana activo={focused} glifo={ICONO_ALERTA} />,
        }}
      />
      <Tabs.Screen
        name="contactos"
        options={{
          title: "Contactos",
          tabBarLabel: "Contactos",
          tabBarAccessibilityLabel: "Contactos",
          tabBarIcon: ({ focused }) => <IconoPestana activo={focused} glifo={ICONO_CONTACTOS} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: "Historial",
          tabBarLabel: "Historial",
          tabBarAccessibilityLabel: "Historial",
          tabBarIcon: ({ focused }) => <IconoPestana activo={focused} glifo={ICONO_HISTORIAL} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  escena: {
    backgroundColor: COLOR.fondo,
  },
  encabezado: {
    backgroundColor: COLOR.fondo,
  },
  tituloEncabezado: {
    color: COLOR.texto,
    fontSize: 18,
    fontWeight: "700",
  },
  botonAjustes: {
    alignItems: "center",
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.circulo,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: ESPACIO.md,
    paddingVertical: ESPACIO.sm,
  },
  textoAjustes: {
    color: COLOR.marca,
    fontSize: 15,
    fontWeight: "700",
  },
  presionado: {
    opacity: 0.6,
  },
  barraPestanas: {
    backgroundColor: COLOR.superficie,
    borderTopColor: COLOR.borde,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 6,
    paddingTop: 6,
  },
  itemPestana: {
    paddingVertical: 2,
  },
  etiquetaPestana: {
    fontSize: 12,
    fontWeight: "600",
  },
  icono: {
    fontSize: 20,
    lineHeight: 24,
  },
  iconoActivo: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  iconoInactivo: {
    opacity: 0.6,
  },
  zonaBotonHeader: {
    paddingRight: ESPACIO.md,
  },
});
