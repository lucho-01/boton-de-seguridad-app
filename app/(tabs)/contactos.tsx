import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

import { Boton } from "@/components/Boton";
import { Icono, type NombreIcono } from "@/components/Icono";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { Parrafo } from "@/components/Parrafo";
import { TituloPantalla } from "@/components/TituloPantalla";
import { COLOR, ESPACIO, RADIO, SOMBRA_TARJETA } from "@/components/tema";
import { useContactosController, type ContactoConfianza, esPrincipal } from "@/controllers";

/** Texto del estado vacío. */
export const TEXTO_SIN_CONTACTOS = "Todavía no tienes contactos de confianza.";
/** Texto del botón principal para agregar. */
export const TEXTO_AGREGAR_CONTACTO = "Añadir contacto";
/** Etiqueta del botón de editar en una fila. */
export const ETIQUETA_EDITAR = "Editar contacto";
/** Etiqueta del botón de eliminar en una fila. */
export const ETIQUETA_ELIMINAR = "Eliminar contacto";
/** Etiqueta del botón de marcar como principal. */
export const ETIQUETA_MARCAR_PRINCIPAL = "Marcar como principal";
/** Texto del indicador de contacto principal. */
export const TEXTO_PRINCIPAL = "Principal";
/** Umbral de deslizamiento para eliminar (igual que M3, spec R4). */
export const UMBRAL_ELIMINAR = 96;
/** Tiempo máximo entre dos toques para considerarlo doble toque (ms). */
export const TIEMPO_DOBLE_TOQUE = 300;

/** Etiqueta accesible de la fila (doble toque para marcar principal). */
function etiquetaPrincipalDeFila(contacto: ContactoConfianza): string {
  const principal = esPrincipal(contacto);
  const nombre = contacto.nombre;
  if (principal) {
    return `${nombre}. Desmarcar como principal`;
  }
  return `${nombre}. Marcar como principal`;
}

/** Inicial del contacto para el avatar de la fila (vacío → «?»). */
function inicialDe(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.length === 0) {
    return "?";
  }
  return limpio.slice(0, 1).toUpperCase();
}

interface FilaContactoProps {
  contacto: ContactoConfianza;
  onEditar: (id: string) => void;
  onPedirEliminar: (id: string, nombre: string) => void;
  onMarcarPrincipal: (id: string) => void;
  estaConfirmando: boolean;
  onConfirmar: (confirmar: boolean) => void;
}

interface ConfirmacionEliminarProps {
  contacto: ContactoConfianza;
  estaConfirmando: boolean;
  onConfirmar: (confirmar: boolean) => void;
}

/** Diálogo de confirmación para eliminar un contacto. */
function ConfirmacionEliminar({
  contacto,
  estaConfirmando,
  onConfirmar,
}: ConfirmacionEliminarProps) {
  if (!estaConfirmando) {
    return null;
  }
  return (
    <View style={styles.confirmacion}>
      <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.pregunta}>
        ¿Eliminar el contacto "{contacto.nombre}"?
      </Text>
      <View style={styles.botonesConfirmacion}>
        <Boton
          texto="Cancelar"
          etiquetaAccesible="Cancelar eliminación"
          onPress={() => onConfirmar(false)}
          variante="secundario"
        />
        <Boton
          texto="Eliminar"
          etiquetaAccesible="Confirmar eliminación del contacto"
          onPress={() => onConfirmar(true)}
          variante="peligro"
        />
      </View>
    </View>
  );
}

/** Cabecera de la fila: avatar con inicial, datos y etiqueta de principal. */
function CabeceraContacto({
  contacto,
  principal,
}: {
  contacto: ContactoConfianza;
  principal: boolean;
}) {
  return (
    <View style={styles.cabecera}>
      <View style={styles.avatar}>
        <Text allowFontScaling={false} style={styles.inicial}>
          {inicialDe(contacto.nombre)}
        </Text>
      </View>
      <View style={styles.datos}>
        <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.nombre}>
          {contacto.nombre}
        </Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.telefono}>
          {contacto.telefono}
        </Text>
        {contacto.parentesco !== null && contacto.parentesco !== "" && (
          <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.parentesco}>
            {contacto.parentesco}
          </Text>
        )}
      </View>
      {principal && (
        <View style={styles.etiquetaPrincipal}>
          <Icono nombre="principal" tamano={13} color={COLOR.exito} />
          <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.textoPrincipal}>
            {TEXTO_PRINCIPAL}
          </Text>
        </View>
      )}
    </View>
  );
}

function AccionContacto({
  etiqueta,
  icono,
  color,
  onPress,
  deshabilitado = false,
  seleccionado = false,
}: {
  etiqueta: string;
  icono: NombreIcono;
  color: string;
  onPress: () => void;
  deshabilitado?: boolean;
  seleccionado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado, selected: seleccionado }}
      disabled={deshabilitado}
      hitSlop={2}
      onPress={onPress}
      style={({ pressed }) => [
        styles.accion,
        seleccionado && styles.accionSeleccionada,
        deshabilitado && styles.accionDeshabilitada,
        pressed && styles.accionPresionada,
      ]}
    >
      <Icono nombre={icono} tamano={19} color={color} />
    </Pressable>
  );
}

/** Fila de un contacto: datos, botones editar/eliminar/principal y gestos. */
function FilaContacto({
  contacto,
  onEditar,
  onPedirEliminar,
  onMarcarPrincipal,
  estaConfirmando,
  onConfirmar,
}: FilaContactoProps) {
  const principal = esPrincipal(contacto);
  const desplazamiento = { current: 0 },
    [ultimoToque, setUltimoToque] = useState<number | null>(null);
  const gestoPan = usePanGesture({
    runOnJS: true,
    activeOffsetX: -10,
    failOffsetX: 10,
    onUpdate: (evento) => (desplazamiento.current = Math.min(0, evento.translationX)),
    onDeactivate: (evento) => {
      if (evento.translationX <= -UMBRAL_ELIMINAR) {
        onPedirEliminar(contacto.id, contacto.nombre);
      }
      desplazamiento.current = 0;
    },
  });
  const alTocar = () => {
    const ahora = Date.now();
    if (ultimoToque !== null && ahora - ultimoToque < TIEMPO_DOBLE_TOQUE) {
      setUltimoToque(null);
      onMarcarPrincipal(contacto.id);
    } else {
      setUltimoToque(ahora);
    }
  };
  return (
    <GestureDetector gesture={gestoPan}>
      <Pressable
        onPress={alTocar}
        accessibilityRole="button"
        accessibilityLabel={etiquetaPrincipalDeFila(contacto)}
        accessibilityHint="Doble toque para marcar este contacto como principal (solo uno a la vez)"
      >
        <View
          style={[
            styles.fila,
            principal && styles.filaPrincipal,
            { transform: [{ translateX: desplazamiento.current }] },
          ]}
        >
          <CabeceraContacto contacto={contacto} principal={principal} />
          <View style={styles.botones}>
            <AccionContacto
              etiqueta={`${ETIQUETA_EDITAR}: ${contacto.nombre}`}
              icono="editar"
              color={COLOR.marca}
              onPress={() => onEditar(contacto.id)}
            />
            <AccionContacto
              etiqueta={`${ETIQUETA_ELIMINAR}: ${contacto.nombre}`}
              icono="eliminar"
              color={COLOR.peligro}
              onPress={() => onPedirEliminar(contacto.id, contacto.nombre)}
              deshabilitado={estaConfirmando}
            />
            <AccionContacto
              etiqueta={etiquetaDeAccionPrincipal(contacto, principal)}
              icono="principal"
              color={colorDePrincipal(principal)}
              onPress={() => onMarcarPrincipal(contacto.id)}
              seleccionado={principal}
            />
          </View>
          <ConfirmacionEliminar
            contacto={contacto}
            estaConfirmando={estaConfirmando}
            onConfirmar={onConfirmar}
          />
        </View>
      </Pressable>
    </GestureDetector>
  );
}

function colorDePrincipal(principal: boolean): string {
  if (principal) {
    return COLOR.exito;
  }
  return COLOR.textoSuave;
}

function etiquetaDeAccionPrincipal(contacto: ContactoConfianza, principal: boolean): string {
  if (principal) {
    return `Quitar a ${contacto.nombre} como contacto principal`;
  }
  return `${ETIQUETA_MARCAR_PRINCIPAL}: ${contacto.nombre}`;
}

interface PantallaContactosProps {
  /** Inyectado para pruebas; por defecto usa SQLite. */
  controlador?: ReturnType<typeof useContactosController>;
}

/** Pantalla de contactos de confianza (M4 y M5): listado, alta, edición, eliminación y gestos. */
export default function PantallaContactos({ controlador }: PantallaContactosProps): ReactNode {
  const router = useRouter();
  const ctl = controlador ?? useContactosController();
  const [contactoParaEliminar, setContactoParaEliminar] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  const irAAgregar = () => {
    void router.push("/contacto");
  };

  const irAEditar = (id: string) => {
    void router.push(`/contacto?id=${id}`);
  };

  const pedirEliminar = (id: string, nombre: string) => {
    setContactoParaEliminar({ id, nombre });
  };

  const responderConfirmacion = (confirmar: boolean) => {
    if (contactoParaEliminar === null) {
      return;
    }
    if (confirmar) {
      void ctl.eliminar(contactoParaEliminar.id);
    }
    setContactoParaEliminar(null);
  };

  const marcarPrincipal = (id: string) => {
    void ctl.togglePrincipal(id);
  };

  return (
    <PantallaConAviso conBarraDePestanas>
      <View style={styles.introduccion}>
        <TituloPantalla>Contactos de confianza</TituloPantalla>
        <Parrafo>Personas a quienes avisaremos si necesitas ayuda.</Parrafo>
      </View>
      {ctl.aviso !== null && <Parrafo>{ctl.aviso}</Parrafo>}
      {ctl.contactos.length === 0 && (
        <View style={styles.estadoVacio}>
          <View style={styles.iconoVacio}>
            <Icono nombre="contactos" tamano={28} color={COLOR.marca} />
          </View>
          <Text allowFontScaling maxFontSizeMultiplier={1.5} style={styles.tituloVacio}>
            Aún no hay contactos
          </Text>
          <Parrafo>{TEXTO_SIN_CONTACTOS}</Parrafo>
        </View>
      )}
      {ctl.contactos.length > 0 && (
        <View style={styles.lista}>
          {ctl.contactos.map((contacto) => {
            const estaConfirmando =
              contactoParaEliminar !== null && contactoParaEliminar.id === contacto.id;
            return (
              <FilaContacto
                key={contacto.id}
                contacto={contacto}
                onEditar={irAEditar}
                onPedirEliminar={pedirEliminar}
                onMarcarPrincipal={marcarPrincipal}
                estaConfirmando={estaConfirmando}
                onConfirmar={responderConfirmacion}
              />
            );
          })}
        </View>
      )}
      <Boton
        texto={TEXTO_AGREGAR_CONTACTO}
        etiquetaAccesible="Añadir un contacto de confianza"
        onPress={irAAgregar}
        deshabilitado={!ctl.puedeAgregar}
      />
      <View style={styles.privacidad}>
        <Icono nombre="escudo" tamano={18} color={COLOR.marca} />
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.textoPrivacidad}>
          Tus datos se guardan de forma privada y se sincronizan solo con tu cuenta.
        </Text>
      </View>
    </PantallaConAviso>
  );
}

const styles = StyleSheet.create({
  introduccion: {
    gap: ESPACIO.xs,
  },
  fila: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    marginBottom: ESPACIO.md,
    minHeight: 74,
    overflow: "hidden",
    padding: ESPACIO.md,
    ...SOMBRA_TARJETA,
  },
  filaPrincipal: {
    borderColor: "#BFEBDD",
  },
  cabecera: {
    alignItems: "center",
    flexDirection: "row",
    gap: ESPACIO.md,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.sm,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  inicial: {
    color: COLOR.marcaOscura,
    fontSize: 18,
    fontWeight: "800",
  },
  datos: {
    flex: 1,
  },
  nombre: {
    color: COLOR.texto,
    fontSize: 15,
    fontWeight: "700",
  },
  telefono: {
    color: COLOR.textoSuave,
    fontSize: 13,
    marginTop: 2,
  },
  parentesco: {
    color: COLOR.textoSuave,
    fontSize: 12,
    marginTop: 2,
  },
  etiquetaPrincipal: {
    alignItems: "center",
    backgroundColor: COLOR.exitoSuave,
    borderRadius: RADIO.circulo,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: ESPACIO.sm,
    paddingVertical: 5,
  },
  textoPrincipal: {
    color: COLOR.exito,
    fontSize: 12,
    fontWeight: "700",
  },
  botones: {
    flexDirection: "row",
    gap: ESPACIO.xs,
    marginTop: ESPACIO.md,
  },
  accion: {
    alignItems: "center",
    backgroundColor: COLOR.superficieAlterna,
    borderColor: COLOR.borde,
    borderRadius: RADIO.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  accionSeleccionada: {
    backgroundColor: COLOR.exitoSuave,
    borderColor: "#BFEBDD",
  },
  accionDeshabilitada: {
    opacity: 0.45,
  },
  accionPresionada: {
    opacity: 0.72,
  },
  confirmacion: {
    backgroundColor: COLOR.avisoFondo,
    borderColor: COLOR.avisoBorde,
    borderLeftWidth: 4,
    borderRadius: RADIO.sm,
    marginTop: ESPACIO.md,
    padding: ESPACIO.md,
  },
  pregunta: {
    color: COLOR.avisoTexto,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: ESPACIO.sm,
  },
  botonesConfirmacion: {
    flexDirection: "row",
    gap: ESPACIO.sm,
  },
  lista: {
    gap: 0,
  },
  estadoVacio: {
    alignItems: "center",
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: ESPACIO.sm,
    paddingHorizontal: ESPACIO.xl,
    paddingVertical: ESPACIO.xl,
  },
  iconoVacio: {
    alignItems: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.md,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  tituloVacio: {
    color: COLOR.texto,
    fontSize: 18,
    fontWeight: "700",
  },
  privacidad: {
    alignItems: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.md,
    flexDirection: "row",
    gap: ESPACIO.sm,
    padding: ESPACIO.md,
  },
  textoPrivacidad: {
    color: COLOR.marcaOscura,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
