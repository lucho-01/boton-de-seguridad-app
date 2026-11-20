import { Link, Tabs } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icono, type NombreIcono } from "@/components/Icono";
import { COLOR, ESPACIO, RADIO } from "@/components/tema";

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
        hitSlop={4}
        style={estiloBotonAjustes}
      >
        <Icono nombre="ajustes" tamano={22} color={COLOR.textoSuave} />
      </Pressable>
    </Link>
  );
}

function EncabezadoMarca({ titulo }: { titulo: string }) {
  return (
    <View style={styles.marcaEncabezado}>
      <View style={styles.iconoMarca}>
        <Icono nombre="escudo" tamano={22} color={COLOR.blanco} />
      </View>
      <View style={styles.textosEncabezado}>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.tituloEncabezado}>
          {titulo}
        </Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.subtituloEncabezado}>
          Protección personal
        </Text>
      </View>
    </View>
  );
}

/** Icono SVG decorativo; el nombre accesible va en `tabBarLabel`. */
function IconoPestana({ nombre, color }: { nombre: NombreIcono; color: ColorValue }) {
  return <Icono nombre={nombre} tamano={22} color={color} grosor={1.9} />;
}

/** Pestañas del producto: alerta, contactos e historial, con acceso a ajustes. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const espacioSeguro = Math.max(9, insets.bottom);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLOR.marca,
        tabBarInactiveTintColor: COLOR.textoSuave,
        tabBarLabelStyle: styles.etiquetaPestana,
        tabBarAllowFontScaling: true,
        tabBarStyle: [
          styles.barraPestanas,
          { height: 52 + espacioSeguro, paddingBottom: espacioSeguro },
        ],
        tabBarItemStyle: styles.itemPestana,
        sceneStyle: styles.escena,
        headerStyle: styles.encabezado,
        headerTitleAlign: "left",
        headerTitle: () => <EncabezadoMarca titulo="Alerta" />,
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
          tabBarIcon: ({ color }) => <IconoPestana color={color} nombre="alerta" />,
        }}
      />
      <Tabs.Screen
        name="contactos"
        options={{
          title: "Contactos",
          tabBarLabel: "Contactos",
          tabBarAccessibilityLabel: "Contactos",
          tabBarIcon: ({ color }) => <IconoPestana color={color} nombre="contactos" />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: "Historial",
          tabBarLabel: "Historial",
          tabBarAccessibilityLabel: "Historial",
          tabBarIcon: ({ color }) => <IconoPestana color={color} nombre="historial" />,
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
    height: 62,
  },
  marcaEncabezado: {
    alignItems: "center",
    flexDirection: "row",
    gap: ESPACIO.md,
  },
  iconoMarca: {
    alignItems: "center",
    backgroundColor: COLOR.marca,
    borderRadius: RADIO.md,
    elevation: 3,
    height: 42,
    justifyContent: "center",
    shadowColor: COLOR.marca,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 42,
  },
  textosEncabezado: {
    gap: 1,
  },
  tituloEncabezado: {
    color: COLOR.texto,
    fontSize: 14,
    fontWeight: "700",
  },
  subtituloEncabezado: {
    color: COLOR.textoSuave,
    fontSize: 11,
  },
  botonAjustes: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  presionado: {
    opacity: 0.6,
  },
  barraPestanas: {
    backgroundColor: COLOR.superficie,
    borderTopColor: COLOR.borde,
    borderTopWidth: 1,
    paddingTop: 5,
  },
  itemPestana: {
    paddingVertical: 2,
  },
  etiquetaPestana: {
    fontSize: 11,
    fontWeight: "600",
  },
  zonaBotonHeader: {
    paddingRight: ESPACIO.md,
  },
});
