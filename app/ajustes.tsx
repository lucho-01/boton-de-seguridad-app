import { useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { BloqueEstadoApi } from "@/components/BloqueEstadoApi";
import { BloqueSesion } from "@/components/BloqueSesion";
import { Boton } from "@/components/Boton";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { Parrafo } from "@/components/Parrafo";
import { TituloPantalla } from "@/components/TituloPantalla";
import { type SesionConUsuario, correoDeSesion } from "@/components/estadoSesion";
import { COLOR, ESPACIO, RADIO } from "@/components/tema";
import { useSesion, useSincronizacion } from "@/controllers/sesionContext";
import { useAjustesController } from "@/controllers/useAjustesController";
import { type EstadoApi } from "@/controllers/useSesionController";
import type { SincronizacionController } from "@/controllers/useSincronizacionController";
import {
  LIMITE_MENSAJE_BASE,
  UMBRAL_SACUDIDA_POR_DEFECTO,
  VENTANA_SACUDIDA_POR_DEFECTO,
} from "@/services/ajustes";

/** Etiquetas de los botones. */
export const TEXTO_GUARDAR_AJUSTES = "Guardar ajustes";
export const TEXTO_REESTABLECER_AJUSTES = "Restablecer valores por defecto";

interface CampoNumericoProps {
  etiqueta: string;
  valor: string;
  onCambio: (texto: string) => void;
  teclado?: "numeric" | "default" | "email-address" | "phone-pad" | "number-pad";
  etiquetaAccesible: string;
  error?: string | null;
}

/** Campo numérico con etiqueta y error debajo. */
function CampoNumerico({
  etiqueta,
  valor,
  onCambio,
  error,
  teclado = "numeric",
  etiquetaAccesible,
}: CampoNumericoProps) {
  return (
    <View style={styles.campo}>
      <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.etiqueta}>
        {etiqueta}
      </Text>
      <TextInput
        accessibilityLabel={etiquetaAccesible ?? etiqueta}
        accessibilityRole="text"
        allowFontScaling
        keyboardType={teclado}
        onChangeText={onCambio}
        style={styles.input}
        value={valor}
      />
      {error && (
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

interface VistaAjustesProps {
  umbral: string;
  setUmbral: (texto: string) => void;
  ventana: string;
  setVentana: (texto: string) => void;
  mensaje: string;
  errorMensaje: string | null;
  actualizarMensaje: (texto: string) => Promise<void>;
  aviso: string | null;
  puedeGuardar: boolean;
  estadoApi: EstadoApi;
  comprobando: boolean;
  verificarApi: () => void;
  sesionConUsuario: SesionConUsuario | null;
  iniciando: boolean;
  cerrar: () => void;
  sincronizacion: SincronizacionController;
  guardarAjustes: () => Promise<void>;
  restablecerAjustes: () => Promise<void>;
}

/** Cuerpo visual del formulario de ajustes. */
function VistaAjustes({
  umbral,
  setUmbral,
  ventana,
  setVentana,
  mensaje,
  errorMensaje,
  actualizarMensaje,
  aviso,
  puedeGuardar,
  estadoApi,
  comprobando,
  verificarApi,
  sesionConUsuario,
  iniciando,
  cerrar,
  sincronizacion,
  guardarAjustes,
  restablecerAjustes,
}: VistaAjustesProps) {
  return (
    <PantallaConAviso>
      <TituloPantalla>Ajustes</TituloPantalla>
      <BloqueEstadoApi estado={estadoApi} comprobando={comprobando} onComprobar={verificarApi} />
      <BloqueSesion
        email={correoDeSesion(sesionConUsuario)}
        iniciando={iniciando}
        onCerrar={cerrar}
      />
      <View style={styles.bloqueAjustes}>
        <Parrafo>Sincronización de contactos y alertas</Parrafo>
        <Parrafo>{sincronizacion.mensaje}</Parrafo>
        {sesionConUsuario !== null && (
          <Boton
            texto="Sincronizar ahora"
            etiquetaAccesible="Sincronizar contactos y alertas ahora"
            onPress={() => {
              void sincronizacion.sincronizar();
            }}
            deshabilitado={sincronizacion.estado === "sincronizando"}
            variante="secundario"
          />
        )}
      </View>
      <View style={styles.bloqueAjustes}>
        <Parrafo>Sensibilidad de la sacudida (para M7)</Parrafo>
        <CampoNumerico
          etiqueta="Umbral de aceleración (m/s²)"
          valor={umbral}
          onCambio={setUmbral}
          etiquetaAccesible="Umbral de aceleración de la sacudida"
        />
        <CampoNumerico
          etiqueta="Ventana de tiempo (ms)"
          valor={ventana}
          onCambio={setVentana}
          etiquetaAccesible="Ventana de tiempo para detectar sacudidas"
        />
        <View style={styles.contador}>
          <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.textoAyuda}>
            Umbral por defecto: {UMBRAL_SACUDIDA_POR_DEFECTO} m/s² · ventana:{" "}
            {VENTANA_SACUDIDA_POR_DEFECTO} ms
          </Text>
        </View>
      </View>
      <View style={styles.bloqueAjustes}>
        <Parrafo>Mensaje base del SMS (para M10)</Parrafo>
        <CampoNumerico
          etiqueta="Mensaje base"
          valor={mensaje}
          onCambio={actualizarMensaje}
          error={errorMensaje}
          teclado="default"
          etiquetaAccesible="Mensaje base del SMS de emergencia"
        />
        <View style={styles.contador}>
          <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.textoAyuda}>
            {mensaje.length} / {LIMITE_MENSAJE_BASE} caracteres
          </Text>
        </View>
      </View>
      <View style={styles.botones}>
        <Boton
          texto={TEXTO_GUARDAR_AJUSTES}
          etiquetaAccesible="Guardar ajustes de sensibilidad y mensaje base"
          onPress={guardarAjustes}
          deshabilitado={!puedeGuardar}
        />
        <Boton
          texto={TEXTO_REESTABLECER_AJUSTES}
          etiquetaAccesible="Restablecer valores por defecto de sensibilidad y mensaje base"
          onPress={restablecerAjustes}
          variante="secundario"
        />
      </View>
      {aviso !== null && <Parrafo>{aviso}</Parrafo>}
    </PantallaConAviso>
  );
}

/** Pantalla de ajustes de M6: servidor, sesión, sensibilidad y mensaje base. */
export default function PantallaAjustes({
  controlador,
}: {
  controlador?: ReturnType<typeof useAjustesController>;
}): ReactNode {
  const { sesion, iniciando, estadoApi, comprobando, verificarApi, cerrar } = useSesion();
  const sincronizacion = useSincronizacion();
  const sesionConUsuario: SesionConUsuario | null = sesion;
  const ctl = controlador ?? useAjustesController();
  const [umbral, setUmbral] = useState(ctl.ajustes.umbralSacudida.toString());
  const [ventana, setVentana] = useState(ctl.ajustes.ventanaSacudida.toString());
  const [mensaje, setMensaje] = useState(ctl.ajustes.mensajeBase);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const actualizarMensaje = async (texto: string): Promise<void> => {
    setMensaje(texto);
    const resultado = await ctl.actualizarMensajeBase(texto);
    setErrorMensaje(resultado.error ?? null);
  };

  const guardarAjustes = async (): Promise<void> => {
    setErrorMensaje(null);
    await ctl.guardar();
  };

  const restablecerAjustes = async (): Promise<void> => {
    await ctl.restablecerValoresPorDefecto();
    setUmbral(ctl.ajustes.umbralSacudida.toString());
    setVentana(ctl.ajustes.ventanaSacudida.toString());
    setMensaje(ctl.ajustes.mensajeBase);
    setErrorMensaje(null);
  };

  return (
    <VistaAjustes
      umbral={umbral}
      setUmbral={setUmbral}
      ventana={ventana}
      setVentana={setVentana}
      mensaje={mensaje}
      errorMensaje={errorMensaje}
      actualizarMensaje={actualizarMensaje}
      aviso={ctl.aviso}
      puedeGuardar={ctl.puedeGuardar}
      estadoApi={estadoApi}
      comprobando={comprobando}
      verificarApi={verificarApi}
      sesionConUsuario={sesionConUsuario}
      iniciando={iniciando}
      cerrar={cerrar}
      sincronizacion={sincronizacion}
      guardarAjustes={guardarAjustes}
      restablecerAjustes={restablecerAjustes}
    />
  );
}

const styles = StyleSheet.create({
  bloqueAjustes: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.md,
    borderWidth: 1,
    padding: ESPACIO.lg,
  },
  campo: {
    marginBottom: ESPACIO.lg,
  },
  etiqueta: {
    color: COLOR.texto,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLOR.superficieAlterna,
    borderColor: COLOR.bordeFuerte,
    borderRadius: RADIO.sm,
    borderWidth: 1,
    color: COLOR.texto,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: ESPACIO.md,
  },
  error: {
    color: COLOR.peligro,
    fontSize: 14,
    marginTop: 4,
  },
  contador: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  textoAyuda: {
    color: COLOR.textoSuave,
    fontSize: 13,
  },
  botones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ESPACIO.sm,
    marginTop: ESPACIO.sm,
  },
});
