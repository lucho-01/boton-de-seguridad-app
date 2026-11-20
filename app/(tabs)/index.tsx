import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { BotonAlternativoArmado } from "@/components/BotonAlternativoArmado";
import { Boton } from "@/components/Boton";
import { BotonSos } from "@/components/BotonSos";
import { ContenidoArmado } from "@/components/ContenidoArmado";
import { CuentaRegresiva } from "@/components/CuentaRegresiva";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { Parrafo } from "@/components/Parrafo";
import { TituloPantalla } from "@/components/TituloPantalla";
import { useArmadoController, type EstadoArmado } from "@/controllers";
import { detectarSacudidaTriple, type MuestraAceleracion } from "@/services/sacudida";
import { valoresPorDefecto } from "@/services/ajustes";
import { useAcelerometro } from "@/sensors/useAcelerometro";
import { useUbicacion, type Ubicacion } from "@/sensors/useUbicacion";

/** Umbral y ventana de sacudida triple (ajustes de M6). */
const { umbralSacudida, ventanaSacudida } = valoresPorDefecto();

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
  /** Ubicación obtenida al pasar a `lista` (M8). */
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  /** Si se intentó obtener ubicación y no se pudo (M8). */
  const [ubicacionFallida, setUbicacionFallida] = useState<boolean>(false);
  /** Evita solicitar ubicación más de una vez por visita a `lista`. */
  const solicitudRef = useRef<boolean>(false);

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

  /** Al llegar a `lista`, solicita la ubicación automáticamente (M8 R1). */
  useEffect(() => {
    if (estado !== "lista") {
      return;
    }
    if (solicitudRef.current) {
      return;
    }
    solicitudRef.current = true;
    void obtenerUbicacion().then((resultado: Ubicacion | null) => {
      if (resultado === null) {
        setUbicacionFallida(true);
        return;
      }
      setUbicacion(resultado);
    });
  }, [estado, obtenerUbicacion]);

  /** Limpia la ubicación al volver al reposo para la próxima cuenta. */
  useEffect(() => {
    if (estado !== "idle") {
      return;
    }
    setUbicacion(null);
    setUbicacionFallida(false);
    solicitudRef.current = false;
  }, [estado]);

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
      <Parrafo>{textoEstadoSacudida(disponibleSacudida)}</Parrafo>
      <Parrafo>{textoEstadoUbicacion(disponibleUbicacion)}</Parrafo>
      <ContenidoArmado
        estado={estado}
        onVolverAlInicio={volverAlInicio}
        ubicacion={ubicacion}
        ubicacionFallida={ubicacionFallida}
      />
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
  return <Parrafo>{textoBateria(nivelBateria)}</Parrafo>;
}

/** Texto del porcentaje de batería (M9 R4: entero, ej: "Batería: 84%"). */
function textoBateria(nivel: number): string {
  return `Batería: ${nivel}%`;
}
