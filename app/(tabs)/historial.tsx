import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Boton } from "@/components/Boton";
import { Icono } from "@/components/Icono";
import { Parrafo } from "@/components/Parrafo";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { TituloPantalla } from "@/components/TituloPantalla";
import { COLOR, ESPACIO, RADIO, SOMBRA_TARJETA } from "@/components/tema";
import { useHistorialController } from "@/controllers/useHistorialController";
import type { Alerta } from "@/models";

function etiquetaEstado(estado: Alerta["estado"]): string {
  if (estado === "cancelada") {
    return "Alerta cancelada";
  }
  return "Mensaje preparado";
}

function fechaLegible(fecha: string): string {
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) {
    return fecha;
  }
  return parsed.toLocaleString();
}

function FilaAlerta({ alerta }: { alerta: Alerta }) {
  let detalle = "Ubicación no disponible";
  if (alerta.lat !== null && alerta.lng !== null) {
    detalle = "Ubicación registrada";
  }
  if (alerta.bateria_pct !== null) {
    detalle = `${detalle} · Batería ${alerta.bateria_pct}%`;
  }

  return (
    <View accessibilityRole="summary" style={styles.tarjeta}>
      <View style={styles.cabeceraTarjeta}>
        <View style={styles.iconoAlerta}>
          <Icono nombre="alerta" tamano={20} color={COLOR.marca} />
        </View>
        <View style={styles.textosTarjeta}>
          <Text allowFontScaling style={styles.estado}>
            {etiquetaEstado(alerta.estado)}
          </Text>
          <Text allowFontScaling style={styles.fecha}>
            {fechaLegible(alerta.creada_en)}
          </Text>
        </View>
      </View>
      <View style={styles.detalle}>
        <Icono nombre="ubicacion" tamano={16} color={COLOR.textoSuave} />
        <Parrafo>{detalle}</Parrafo>
      </View>
    </View>
  );
}

export default function PantallaHistorial() {
  const historial = useHistorialController();

  useFocusEffect(
    useCallback(() => {
      void historial.refrescar();
    }, [historial.refrescar]),
  );

  let contenido = (
    <View style={styles.vacio}>
      <View style={styles.iconoVacio}>
        <Icono nombre="historial" tamano={30} color={COLOR.marca} />
      </View>
      <Text allowFontScaling style={styles.tituloVacio}>
        Aún no hay alertas
      </Text>
      <Parrafo>Cuando uses el botón de seguridad, aquí aparecerá tu historial.</Parrafo>
    </View>
  );
  if (historial.cargando) {
    contenido = <Parrafo>Cargando historial…</Parrafo>;
  } else if (historial.aviso !== null) {
    contenido = (
      <View style={styles.bloqueAviso}>
        <Parrafo>{historial.aviso}</Parrafo>
        <Boton
          texto="Reintentar"
          etiquetaAccesible="Volver a cargar el historial"
          onPress={() => {
            void historial.refrescar();
          }}
          variante="secundario"
        />
      </View>
    );
  } else if (historial.alertas.length > 0) {
    contenido = (
      <View style={styles.lista}>
        {historial.alertas.map((alerta) => (
          <FilaAlerta key={alerta.id} alerta={alerta} />
        ))}
      </View>
    );
  }

  return (
    <PantallaConAviso conBarraDePestanas>
      <View style={styles.introduccion}>
        <TituloPantalla>Tu historial</TituloPantalla>
        <Parrafo>Consulta el estado y los detalles de tus alertas anteriores.</Parrafo>
      </View>
      <View style={styles.contenido}>{contenido}</View>
    </PantallaConAviso>
  );
}

const styles = StyleSheet.create({
  introduccion: {
    gap: ESPACIO.xs,
  },
  contenido: {
    gap: ESPACIO.md,
  },
  lista: {
    gap: ESPACIO.md,
  },
  vacio: {
    alignItems: "center",
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    gap: ESPACIO.sm,
    paddingHorizontal: ESPACIO.xl,
    paddingVertical: ESPACIO.xxl,
    ...SOMBRA_TARJETA,
  },
  iconoVacio: {
    alignItems: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.md,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  tituloVacio: {
    color: COLOR.texto,
    fontSize: 18,
    fontWeight: "700",
  },
  tarjeta: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    gap: ESPACIO.md,
    padding: ESPACIO.md,
    ...SOMBRA_TARJETA,
  },
  cabeceraTarjeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: ESPACIO.md,
  },
  iconoAlerta: {
    alignItems: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  textosTarjeta: {
    flex: 1,
    gap: 3,
  },
  estado: {
    color: COLOR.texto,
    fontSize: 15,
    fontWeight: "700",
  },
  fecha: {
    color: COLOR.textoSuave,
    fontSize: 12,
  },
  detalle: {
    alignItems: "center",
    flexDirection: "row",
    gap: ESPACIO.sm,
  },
  bloqueAviso: {
    gap: ESPACIO.md,
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    padding: ESPACIO.lg,
  },
});
