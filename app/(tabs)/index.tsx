import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { BotonAlternativoArmado } from "@/components/BotonAlternativoArmado";
import { Boton } from "@/components/Boton";
import { BotonSos } from "@/components/BotonSos";
import { ContenidoArmado } from "@/components/ContenidoArmado";
import { CuentaRegresiva } from "@/components/CuentaRegresiva";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { Parrafo } from "@/components/Parrafo";
import { TituloPantalla } from "@/components/TituloPantalla";
import { COLOR, ESPACIO, RADIO } from "@/components/tema";
import { useArmadoController, type EstadoArmado } from "@/controllers";
import { useSmsController } from "@/controllers/useSmsController";
import { useRegistrarAlertaController } from "@/controllers/useRegistrarAlertaController";
import { detectarSacudidaTriple, type MuestraAceleracion } from "@/services/sacudida";
import { valoresPorDefecto } from "@/services/ajustes";
import { useAcelerometro } from "@/sensors/useAcelerometro";
import { useUbicacion, type Ubicacion } from "@/sensors/useUbicacion";

/** Umbral y ventana de sacudida triple (ajustes de M6). */
const { umbralSacudida, ventanaSacudida } = valoresPorDefecto();

function ubicacionConvertida(ubicacion: Ubicacion | null) {
  if (ubicacion === null) {
    return null;
  }
  return {
    lat: ubicacion.latitud,
    lng: ubicacion.longitud,
    precision: ubicacion.precision,
  };
}

function useSmsDeEstado(
  estado: EstadoArmado,
  ubicacion: Ubicacion | null,
  bateriaPct: number | null,
) {
  let latitud: number | null = null;
  let longitud: number | null = null;
  if (ubicacion !== null) {
    latitud = ubicacion.latitud;
    longitud = ubicacion.longitud;
  }

  return useSmsController({
    activo: estado === "lista",
    lat: latitud,
    lng: longitud,
    bateriaPct,
  });
}

function useUbicacionLista(
  estado: EstadoArmado,
  obtenerUbicacion: () => Promise<Ubicacion | null>,
) {
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [ubicacionFallida, setUbicacionFallida] = useState(false);
  const solicitudRef = useRef(false);

  useEffect(() => {
    if (estado !== "lista") {
      return;
    }
    if (solicitudRef.current) {
      return;
    }
    solicitudRef.current = true;
    void obtenerUbicacion()
      .then((resultado) => {
        if (resultado === null) {
          setUbicacionFallida(true);
          return;
        }
        setUbicacion(resultado);
      })
      .catch(() => {
        setUbicacionFallida(true);
      });
  }, [estado, obtenerUbicacion]);

  useEffect(() => {
    if (estado !== "idle") {
      return;
    }
    setUbicacion(null);
    setUbicacionFallida(false);
    solicitudRef.current = false;
  }, [estado]);

  return { ubicacion, ubicacionFallida };
}

/**
 * Pantalla del botón SOS (M2), cuenta regresiva (M3), sacudida triple (M7) y
 * ubicación al terminar la cuenta (M8).
 * El controlador es la única fuente de verdad del progreso: la pantalla no usa
 * temporizadores.
 */
export default function PantallaAlerta() {
  const {
    estado,
    progreso,
    restanteSegundos,
    iniciar,
    cancelar,
    armarConBoton,
    volverAlInicio,
    bateria,
  } = useArmadoController();

  const { disponible: disponibleSacudida, suscribir } = useAcelerometro();
  const { disponible: disponibleUbicacion, obtenerUbicacion } = useUbicacion();
  /** Muestras del acelerómetro dentro de la ventana de detección (M7). */
  const muestrasRef = useRef<MuestraAceleracion[]>([]);
  const { ubicacion, ubicacionFallida } = useUbicacionLista(estado, obtenerUbicacion);

  const sms = useSmsDeEstado(estado, ubicacion, bateria.porcentaje);
  const avisoRegistro = useRegistrarAlertaController({
    estado,
    ubicacion: ubicacionConvertida(ubicacion),
    ubicacionLista: ubicacion !== null || ubicacionFallida,
    bateriaPct: bateria.porcentaje,
  });

  /* Soltar cancela solo durante el armado (R2); durante la cuenta, el botón o
     el deslizamiento son las vías de cancelación. */
  const alSoltar = () => {
    if (estado !== "arming") {
      return;
    }
    cancelar();
  };

  /** Suscribe al acelerómetro y detecta sacudida triple para iniciar la cuenta (M7). */
  useEffect(() => {
    if (!disponibleSacudida) {
      return;
    }
    suscribir((x, y, z) => {
      const ahora = new Date();
      const muestra: MuestraAceleracion = {
        x,
        y,
        z,
        tiempo: ahora.getTime(),
      };
      muestrasRef.current = [
        ...muestrasRef.current.filter((m) => ahora.getTime() - m.tiempo <= ventanaSacudida),
        muestra,
      ];
      if (
        estado === "idle" &&
        detectarSacudidaTriple(muestrasRef.current, umbralSacudida, ventanaSacudida)
      ) {
        iniciar();
      }
    });
  }, [disponibleSacudida, suscribir, estado, iniciar, umbralSacudida, ventanaSacudida]);

  return (
    <PantallaConAviso conBarraDePestanas>
      <TituloPantalla>Botón de seguridad</TituloPantalla>
      <BotonSos estado={estado} progreso={progreso} onIniciar={iniciar} onCancelar={alSoltar} />
      {cuentaDeEstado(estado, restanteSegundos, cancelar)}
      <BotonAlternativoArmado onArmar={armarConBoton} disponible={estado === "idle"} />
      <Boton
        texto="Iniciar con sacudida"
        etiquetaAccesible="Iniciar cuenta con sacudida"
        pistaAccesible="Inicia la cuenta de 5 s con un movimiento de sacudida triple"
        onPress={iniciar}
        deshabilitado={estado !== "idle"}
        variante="secundario"
      />
      <PanelSensores
        disponibleSacudida={disponibleSacudida}
        disponibleUbicacion={disponibleUbicacion}
      />
      <ContenidoArmado
        estado={estado}
        onVolverAlInicio={volverAlInicio}
        ubicacion={ubicacion}
        ubicacionFallida={ubicacionFallida}
        sms={sms}
      />
      {avisoRegistro !== null && <Parrafo>{avisoRegistro}</Parrafo>}
      {bloqueBateria(estado, bateria.porcentaje)}
    </PantallaConAviso>
  );
}

/** Texto del indicador de estado del sensor de sacudida (sin ternarios). */
function textoEstadoSacudida(disponible: boolean): string {
  if (disponible) {
    return "Sacudida: disponible";
  }
  return "Sacudida: no disponible";
}

/** Texto del indicador de estado del sensor de ubicación (sin ternarios). */
function textoEstadoUbicacion(disponible: boolean): string {
  if (disponible) {
    return "Ubicación: disponible";
  }
  return "Ubicación: no disponible";
}

/** Tarjeta con el estado de los sensores que usa la pantalla. */
function PanelSensores({
  disponibleSacudida,
  disponibleUbicacion,
}: {
  disponibleSacudida: boolean;
  disponibleUbicacion: boolean;
}) {
  return (
    <View style={styles.tarjetaEstado}>
      <IndicadorEstado
        disponible={disponibleSacudida}
        glifo="🤳"
        texto={textoEstadoSacudida(disponibleSacudida)}
      />
      <View style={styles.separador} />
      <IndicadorEstado
        disponible={disponibleUbicacion}
        glifo="📍"
        texto={textoEstadoUbicacion(disponibleUbicacion)}
      />
    </View>
  );
}

/** Fila de estado de un sensor: punto de color, icono y texto. */
function IndicadorEstado({
  disponible,
  glifo,
  texto,
}: {
  disponible: boolean;
  glifo: string;
  texto: string;
}) {
  let estiloPunto: ViewStyle = styles.puntoInactivo;
  if (disponible) {
    estiloPunto = styles.puntoActivo;
  }
  return (
    <View style={styles.indicador}>
      <Text allowFontScaling={false} style={styles.glifoIndicador}>
        {glifo}
      </Text>
      <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.textoIndicador}>
        {texto}
      </Text>
      <View style={[styles.punto, estiloPunto]} />
    </View>
  );
}

/** Solo durante `countdown` se monta la cuenta regresiva (M3). */
function cuentaDeEstado(
  estado: EstadoArmado,
  restanteSegundos: number,
  onCancelar: () => void,
): ReactNode {
  if (estado !== "countdown") {
    return null;
  }
  return <CuentaRegresiva restanteSegundos={restanteSegundos} onCancelar={onCancelar} />;
}

/** Bloque con el porcentaje de batería durante la cuenta y el estado `lista` (M9). */
function bloqueBateria(estado: EstadoArmado, nivelBateria: number | null): ReactNode {
  if (estado !== "countdown" && estado !== "lista") {
    return null;
  }
  if (nivelBateria === null) {
    return null;
  }
  return (
    <View style={styles.insigniaBateria}>
      <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.textoBateria}>
        {textoBateria(nivelBateria)}
      </Text>
    </View>
  );
}

/** Texto del porcentaje de batería (M9 R4: entero, ej: "Batería: 84%"). */
function textoBateria(nivel: number): string {
  return `Batería: ${nivel}%`;
}

const styles = StyleSheet.create({
  tarjetaEstado: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.md,
    borderWidth: 1,
    paddingHorizontal: ESPACIO.lg,
    paddingVertical: ESPACIO.sm,
  },
  indicador: {
    alignItems: "center",
    flexDirection: "row",
    gap: ESPACIO.sm,
    minHeight: 40,
  },
  glifoIndicador: {
    fontSize: 16,
  },
  textoIndicador: {
    color: COLOR.texto,
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  punto: {
    borderRadius: RADIO.circulo,
    height: 10,
    width: 10,
  },
  puntoActivo: {
    backgroundColor: COLOR.exito,
  },
  puntoInactivo: {
    backgroundColor: COLOR.bordeFuerte,
  },
  separador: {
    backgroundColor: COLOR.borde,
    height: 1,
    marginVertical: ESPACIO.xs,
  },
  insigniaBateria: {
    alignSelf: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.circulo,
    paddingHorizontal: ESPACIO.lg,
    paddingVertical: ESPACIO.sm,
  },
  textoBateria: {
    color: COLOR.marcaOscura,
    fontSize: 15,
    fontWeight: "700",
  },
});
