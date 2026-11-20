import { useState, type ReactNode, useEffect } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { Boton } from "@/components/Boton";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { Parrafo } from "@/components/Parrafo";
import { TituloPantalla } from "@/components/TituloPantalla";
import { COLOR, ESPACIO, RADIO } from "@/components/tema";
import { useContactosController, type DatosContacto, type ContactoConfianza } from "@/controllers";

/** Título cuando se crea un contacto nuevo. */
export const TITULO_NUEVO = "Nuevo contacto";
/** Título cuando se edita un contacto existente. */
export const TITULO_EDICION = "Editar contacto";
/** Etiqueta del campo nombre. */
export const ETIQUETA_NOMBRE = "Nombre";
/** Etiqueta del campo teléfono. */
export const ETIQUETA_TELEFONO = "Teléfono";
/** Etiqueta del campo parentesco. */
export const ETIQUETA_PARENTESCO = "Parentesco";
/** Texto del botón guardar. */
export const TEXTO_GUARDAR = "Guardar";
/** Texto del botón cancelar. */
export const TEXTO_CANCELAR = "Cancelar";

/** Errores por campo del formulario. */
interface ErroresFormulario {
  nombre: string | null;
  telefono: string | null;
  parentesco: string | null;
}

interface CampoFormularioProps {
  etiqueta: string;
  valor: string;
  onCambio: (texto: string) => void;
  error: string | null;
  etiquetaAccesible: string;
  maxLength?: number;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
}

/** Campo de texto con su etiqueta y mensaje de error debajo. */
function CampoFormulario({
  etiqueta,
  valor,
  onCambio,
  error,
  etiquetaAccesible,
  maxLength,
  autoCapitalize,
}: CampoFormularioProps) {
  return (
    <View style={styles.campo}>
      <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.etiqueta}>
        {etiqueta}
      </Text>
      <TextInput
        accessibilityLabel={etiquetaAccesible}
        accessibilityRole="text"
        allowFontScaling
        autoCapitalize={autoCapitalize ?? "none"}
        maxLength={maxLength}
        onChangeText={onCambio}
        style={styles.input}
        value={valor}
      />
      {error !== null && (
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

interface VistaFormularioContactoProps {
  tituloPantalla: string;
  aviso: string | null;
  nombre: string;
  setNombre: (texto: string) => void;
  telefono: string;
  setTelefono: (texto: string) => void;
  parentesco: string;
  setParentesco: (texto: string) => void;
  errores: ErroresFormulario;
  guardar: () => Promise<void>;
  volver: () => void;
}

/** Cuerpo visual del formulario de contacto (extraído para respetar el límite de líneas). */
function VistaFormularioContacto({
  tituloPantalla,
  aviso,
  nombre,
  setNombre,
  telefono,
  setTelefono,
  parentesco,
  setParentesco,
  errores,
  guardar,
  volver,
}: VistaFormularioContactoProps): ReactNode {
  return (
    <PantallaConAviso>
      <TituloPantalla>{tituloPantalla}</TituloPantalla>
      {aviso !== null && <Parrafo>{aviso}</Parrafo>}
      <CampoFormulario
        etiqueta={ETIQUETA_NOMBRE}
        valor={nombre}
        onCambio={setNombre}
        error={errores.nombre}
        etiquetaAccesible={ETIQUETA_NOMBRE}
        maxLength={40}
        autoCapitalize="words"
      />
      <CampoFormulario
        etiqueta={ETIQUETA_TELEFONO}
        valor={telefono}
        onCambio={setTelefono}
        error={errores.telefono}
        etiquetaAccesible={ETIQUETA_TELEFONO}
        maxLength={10}
      />
      <CampoFormulario
        etiqueta={ETIQUETA_PARENTESCO}
        valor={parentesco}
        onCambio={setParentesco}
        error={errores.parentesco}
        etiquetaAccesible={ETIQUETA_PARENTESCO}
        maxLength={40}
        autoCapitalize="words"
      />
      <View style={styles.botones}>
        <Boton
          texto={TEXTO_CANCELAR}
          etiquetaAccesible="Cancelar edición de contacto"
          onPress={volver}
          variante="secundario"
        />
        <Boton texto={TEXTO_GUARDAR} etiquetaAccesible="Guardar contacto" onPress={guardar} />
      </View>
    </PantallaConAviso>
  );
}

interface FormularioContactoProps {
  /** Inyectado para pruebas; por defecto usa SQLite. */
  controlador?: ReturnType<typeof useContactosController>;
  /** Id del contacto a editar, si se abre desde la lista. */
  id?: string;
}

/** Formulario de alta y edición de contacto (M4). */
export default function PantallaContacto({ controlador, id }: FormularioContactoProps): ReactNode {
  const router = useRouter();
  const ctl = controlador ?? useContactosController();
  const { id: idParam } = useLocalSearchParams();
  let contactoId: string | undefined = id;
  if (contactoId === undefined) {
    contactoId = idParam as string | undefined;
  }
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [parentesco, setParentesco] = useState("");
  const [errores, setErrores] = useState<ErroresFormulario>({
    nombre: null,
    telefono: null,
    parentesco: null,
  });
  let contactoParaEditar: ContactoConfianza | null = null;
  if (contactoId !== undefined) {
    contactoParaEditar = ctl.obtenerContacto(contactoId);
  }
  const esEdicion = contactoParaEditar !== null;
  let tituloPantalla: string;
  if (esEdicion) {
    tituloPantalla = TITULO_EDICION;
  } else {
    tituloPantalla = TITULO_NUEVO;
  }

  const cargarContacto = () => {
    if (contactoParaEditar !== null) {
      setNombre(contactoParaEditar.nombre);
      setTelefono(contactoParaEditar.telefono);
      setParentesco(contactoParaEditar.parentesco ?? "");
    }
  };

  useEffect(() => {
    void cargarContacto();
  }, [contactoId, ctl, contactoParaEditar]);

  const volver = () => {
    void router.back();
  };

  const guardar = async (): Promise<void> => {
    const datos: DatosContacto = {
      nombre,
      telefono,
      parentesco,
      principal: contactoParaEditar?.principal ?? 0,
    };
    const resultado = await ctl.guardar(datos, contactoId);
    if (resultado.ok) {
      void router.back();
      return;
    }
    const erroresPorCampo: ErroresFormulario = {
      nombre: null,
      telefono: null,
      parentesco: null,
    };
    for (let i = 0; i < resultado.errores.length; i += 1) {
      const error = resultado.errores[i];
      if (error.campo === "nombre") {
        erroresPorCampo.nombre = error.mensaje;
      } else if (error.campo === "telefono") {
        erroresPorCampo.telefono = error.mensaje;
      } else if (error.campo === "parentesco") {
        erroresPorCampo.parentesco = error.mensaje;
      }
    }
    setErrores(erroresPorCampo);
  };

  return (
    <VistaFormularioContacto
      tituloPantalla={tituloPantalla}
      aviso={ctl.aviso}
      nombre={nombre}
      setNombre={setNombre}
      telefono={telefono}
      setTelefono={setTelefono}
      parentesco={parentesco}
      setParentesco={setParentesco}
      errores={errores}
      guardar={guardar}
      volver={volver}
    />
  );
}

const styles = StyleSheet.create({
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
  botones: {
    flexDirection: "row",
    gap: ESPACIO.sm,
    marginTop: ESPACIO.lg,
  },
});
