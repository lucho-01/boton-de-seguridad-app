import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Boton } from "@/components/Boton";
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
      <Text allowFontScaling style={styles.estado}>
        {etiquetaEstado(alerta.estado)}
      </Text>
      <Parrafo>{fechaLegible(alerta.creada_en)}</Parrafo>
      <Parrafo>{detalle}</Parrafo>
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

  let contenido = <Parrafo>No hay alertas registradas todavía.</Parrafo>;
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
      <TituloPantalla>Historial</TituloPantalla>
      <View style={styles.contenido}>{contenido}</View>
    </PantallaConAviso>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: ESPACIO.md,
    paddingBottom: ESPACIO.xl,
  },
  lista: {
    gap: ESPACIO.md,
  },
  tarjeta: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.md,
    borderWidth: 1,
    gap: ESPACIO.sm,
    padding: ESPACIO.lg,
    ...SOMBRA_TARJETA,
  },
  estado: {
    color: COLOR.texto,
    fontSize: 18,
    fontWeight: "700",
  },
  bloqueAviso: {
    gap: ESPACIO.md,
  },
});
