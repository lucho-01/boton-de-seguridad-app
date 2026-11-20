import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BotonAlternativoArmado } from "@/components/BotonAlternativoArmado";
import { BotonSos } from "@/components/BotonSos";
import { ContenidoArmado } from "@/components/ContenidoArmado";
import { CuentaRegresiva } from "@/components/CuentaRegresiva";
import { Icono, type NombreIcono } from "@/components/Icono";
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
      <View style={styles.introduccion}>
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.eyebrow}>
          PROTECCIÓN ACTIVA
        </Text>
        <TituloPantalla>Estamos contigo</TituloPantalla>
        <Parrafo>
          Si estás en riesgo, mantén pulsado el botón. Avisaremos a tu contacto principal.
        </Parrafo>
      </View>
      <View style={styles.tarjetaSos}>
        <BotonSos estado={estado} progreso={progreso} onIniciar={iniciar} onCancelar={alSoltar} />
      </View>
      {cuentaDeEstado(estado, restanteSegundos, cancelar)}
      <BotonAlternativoArmado onArmar={armarConBoton} disponible={estado === "idle"} />
      <PanelSensores
        disponibleSacudida={disponibleSacudida}
        disponibleUbicacion={disponibleUbicacion}
      />
      {estado !== "idle" && (
        <ContenidoArmado
          estado={estado}
          onVolverAlInicio={volverAlInicio}
          ubicacion={ubicacion}
          ubicacionFallida={ubicacionFallida}
          sms={sms}
        />
      )}
      {avisoRegistro !== null && <Parrafo>{avisoRegistro}</Parrafo>}
      {bloqueBateria(estado, bateria.porcentaje)}
    </PantallaConAviso>
  );
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
      <FilaEstado
        disponible={disponibleSacudida}
        nombreIcono="sacudida"
        titulo="Detección por sacudida"
        detalle={textoDisponibilidad(disponibleSacudida)}
      />
      <View style={styles.separador} />
      <FilaEstado
        disponible={disponibleUbicacion}
        nombreIcono="ubicacion"
        titulo="Ubicación"
        detalle={textoUbicacion(disponibleUbicacion)}
      />
    </View>
  );
}

function textoDisponibilidad(disponible: boolean): string {
  if (disponible) {
    return "Disponible en este dispositivo";
  }
  return "No disponible en este dispositivo";
}

function textoUbicacion(disponible: boolean): string {
  if (disponible) {
    return "Precisión alta activada";
  }
  return "Ubicación no disponible";
}

function estadoDeSensor(disponible: boolean): string {
  if (disponible) {
    return "Listo";
  }
  return "No disponible";
}

function iconoDeSensor(disponible: boolean): string {
  if (disponible) {
    return COLOR.exito;
  }
  return COLOR.textoSuave;
}

function estiloIconoEstado(disponible: boolean) {
  if (disponible) {
    return [styles.iconoEstado, styles.iconoDisponible];
  }
  return [styles.iconoEstado, styles.iconoInactivo];
}

function estiloPuntoEstado(disponible: boolean) {
  if (disponible) {
    return [styles.punto, styles.puntoActivo];
  }
  return [styles.punto, styles.puntoInactivo];
}

function estiloTextoEstado(disponible: boolean) {
  if (disponible) {
    return styles.textoListo;
  }
  return [styles.textoListo, styles.textoInactivo];
}

/** Fila accesible con icono, detalle y estado del sensor. */
function FilaEstado({
  disponible,
  nombreIcono,
  titulo,
  detalle,
}: {
  disponible: boolean;
  nombreIcono: NombreIcono;
  titulo: string;
  detalle: string;
}) {
  return (
    <View accessibilityRole="summary" style={styles.filaEstado}>
      <View style={estiloIconoEstado(disponible)}>
        <Icono nombre={nombreIcono} tamano={20} color={iconoDeSensor(disponible)} />
      </View>
      <View style={styles.textoEstado}>
        <Text allowFontScaling maxFontSizeMultiplier={1.5} style={styles.tituloSensor}>
          {titulo}
        </Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.detalleSensor}>
          {detalle}
        </Text>
      </View>
      <View style={styles.estadoListo}>
        <View style={estiloPuntoEstado(disponible)} />
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={estiloTextoEstado(disponible)}>
          {estadoDeSensor(disponible)}
        </Text>
      </View>
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
  introduccion: {
    gap: ESPACIO.xs,
  },
  eyebrow: {
    color: COLOR.marca,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  tarjetaSos: {
    alignItems: "center",
    backgroundColor: COLOR.superficie,
    borderColor: "#F9DEDC",
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 326,
    paddingHorizontal: ESPACIO.md,
    paddingVertical: ESPACIO.md,
    shadowColor: COLOR.peligro,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 20,
  },
  tarjetaEstado: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    paddingHorizontal: ESPACIO.lg,
    paddingVertical: ESPACIO.sm,
    shadowColor: "#0E1726",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
  },
  filaEstado: {
    alignItems: "center",
    flexDirection: "row",
    gap: ESPACIO.md,
    minHeight: 60,
  },
  iconoEstado: {
    alignItems: "center",
    borderRadius: RADIO.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  iconoDisponible: {
    backgroundColor: COLOR.exitoSuave,
  },
  iconoInactivo: {
    backgroundColor: COLOR.superficieAlterna,
  },
  textoEstado: {
    flex: 1,
    gap: 2,
  },
  tituloSensor: {
    color: COLOR.texto,
    fontSize: 14,
    fontWeight: "700",
  },
  detalleSensor: {
    color: COLOR.textoSuave,
    fontSize: 12,
    lineHeight: 17,
  },
  estadoListo: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  textoListo: {
    color: COLOR.exito,
    fontSize: 11,
    fontWeight: "700",
  },
  textoInactivo: {
    color: COLOR.textoSuave,
  },
  punto: {
    borderRadius: RADIO.circulo,
    height: 7,
    width: 7,
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
    marginLeft: 52,
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
