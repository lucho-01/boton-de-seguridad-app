import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

import { Boton } from "@/components/Boton";
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

/** Texto del botón principal según si el contacto ya es principal o no. */
function textoBotonPrincipalDe(principal: boolean): string {
  if (principal) {
    return "Desmarcar principal";
  }
  return "Marcar principal";
}

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
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.etiquetaPrincipal}>
          {TEXTO_PRINCIPAL}
        </Text>
      )}
    </View>
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
            <Boton
              texto="Editar"
              etiquetaAccesible={ETIQUETA_EDITAR}
              pistaAccesible="Abre el formulario para editar este contacto"
              onPress={() => onEditar(contacto.id)}
              variante="secundario"
            />
            <Boton
              texto="Eliminar"
              etiquetaAccesible={ETIQUETA_ELIMINAR}
              pistaAccesible="Pide confirmación antes de borrar el contacto"
              onPress={() => onPedirEliminar(contacto.id, contacto.nombre)}
              variante="peligro"
              deshabilitado={estaConfirmando}
            />
            <Boton
              texto={textoBotonPrincipalDe(principal)}
              etiquetaAccesible={ETIQUETA_MARCAR_PRINCIPAL}
              pistaAccesible="Marca este contacto como el principal (solo uno a la vez)"
              onPress={() => onMarcarPrincipal(contacto.id)}
              variante="secundario"
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
      <TituloPantalla>Contactos</TituloPantalla>
      {ctl.aviso !== null && <Parrafo>{ctl.aviso}</Parrafo>}
      {ctl.contactos.length === 0 && (
        <View style={styles.estadoVacio}>
          <Parrafo>{TEXTO_SIN_CONTACTOS}</Parrafo>
          <Boton
            texto={TEXTO_AGREGAR_CONTACTO}
            etiquetaAccesible="Añadir un contacto de confianza"
            onPress={irAAgregar}
          />
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
    </PantallaConAviso>
  );
}

const styles = StyleSheet.create({
  fila: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.md,
    borderWidth: 1,
    marginBottom: ESPACIO.md,
    minHeight: 56,
    overflow: "hidden",
    padding: ESPACIO.lg,
    ...SOMBRA_TARJETA,
  },
  filaPrincipal: {
    backgroundColor: COLOR.marcaSuave,
    borderColor: COLOR.marca,
  },
  cabecera: {
    alignItems: "center",
    flexDirection: "row",
    gap: ESPACIO.md,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: COLOR.marcaSuave,
    borderRadius: RADIO.circulo,
    height: 44,
    justifyContent: "center",
    width: 44,
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
    fontSize: 17,
    fontWeight: "700",
  },
  telefono: {
    color: COLOR.textoSuave,
    fontSize: 15,
    marginTop: 2,
  },
  parentesco: {
    color: COLOR.textoSuave,
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 2,
  },
  etiquetaPrincipal: {
    backgroundColor: COLOR.marca,
    borderRadius: RADIO.circulo,
    color: COLOR.blanco,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: ESPACIO.sm,
    paddingVertical: 2,
  },
  botones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ESPACIO.sm,
    marginTop: ESPACIO.md,
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
    gap: ESPACIO.xs,
  },
  estadoVacio: {
    alignItems: "center",
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: ESPACIO.md,
    paddingHorizontal: ESPACIO.lg,
    paddingVertical: ESPACIO.xxl,
  },
});
