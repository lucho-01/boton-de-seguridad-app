/**
 * Pantalla de registro de M1: crea una cuenta con correo y contraseña.
 *
 * Solo recibe estado y callbacks del controlador de sesión. Cero SQL, cero
 * fetch directo. Los errores de validación local y de API se muestran debajo
 * del campo correspondiente.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Boton } from "@/components/Boton";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { TituloPantalla } from "@/components/TituloPantalla";
import { COLOR, ESPACIO, RADIO } from "@/components/tema";
import { useSesion } from "@/controllers/sesionContext";
import {
  ERROR_CONTRASENA_CORTA,
  ERROR_CORREO_INVALIDO,
  ERROR_CORREO_REPETIDO,
} from "@/services/auth";

/** Texto del enlace para ir al login. */
export const TEXTO_ENLACE_LOGIN = "¿Ya tienes cuenta? Ingresar";

/** Etiqueta accesible del enlace al login. */
export const ETIQUETA_ENLACE_LOGIN = "Ir a la pantalla de ingreso";

/** Texto del botón de registro. */
const TEXTO_REGISTRAR = "Registrar";

/** Etiqueta accesible del botón de registro. */
const ETIQUETA_REGISTRAR = "Registrar cuenta con el correo y la contraseña escritos";

/** Etiqueta accesible del campo de correo. */
const ETIQUETA_CORREO = "Correo electrónico";

/** Etiqueta accesible del campo de contraseña. */
const ETIQUETA_CONTRASENA = "Contraseña";

/** Pista accesible del botón de registro. */
const PISTA_REGISTRAR = "Crea tu cuenta y accede a la pestaña Alerta";

/** Tipos de teclado permitidos. */
type TipoTeclado = "email-address" | "default" | "numeric" | "phone-pad" | "number-pad";

/** Tipos de tecla de retorno permitidos. */
type TipoRetornoTecla = "done" | "next" | "send" | "search" | "go";

interface CampoTextoProps {
  /** Etiqueta visible sobre el campo. */
  etiqueta: string;
  /** Etiqueta para lectores de pantalla. */
  etiquetaAccesible: string;
  /** Valor actual del campo. */
  valor: string;
  /** Callback al cambiar el texto. */
  onCambioTexto: (texto: string) => void;
  /** Mensaje de error, si lo hay. */
  error: string | null;
  /** Tipo de teclado. */
  teclado?: TipoTeclado;
  /** Tecla de retorno del teclado. */
  retornoTecla?: TipoRetornoTecla;
  /** Si el texto se oculta (contraseña). */
  entradaSegura?: boolean;
}

/** Campo de texto con etiqueta y error debajo. Objetivo táctil >= 44x44. */
function CampoTexto({
  etiqueta,
  etiquetaAccesible,
  valor,
  onCambioTexto,
  error,
  teclado = "default",
  retornoTecla = "done",
  entradaSegura = false,
}: CampoTextoProps): ReactNode {
  return (
    <View style={styles.campo}>
      <Text allowFontScaling maxFontSizeMultiplier={1.6} style={styles.etiqueta}>
        {etiqueta}
      </Text>
      <TextInput
        accessibilityLabel={etiquetaAccesible}
        accessibilityRole="text"
        allowFontScaling
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={teclado}
        onChangeText={onCambioTexto}
        returnKeyType={retornoTecla}
        secureTextEntry={entradaSegura}
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

/** Valida el correo y devuelve el mensaje de error, o null si es válido. */
function validarCorreo(correo: string): string | null {
  if (!correo) {
    return ERROR_CORREO_INVALIDO;
  }
  if (!esCorreoValido(correo)) {
    return ERROR_CORREO_INVALIDO;
  }
  return null;
}

/** Verifica si el correo tiene formato válido (contiene @ y dominio). */
function esCorreoValido(correo: string): boolean {
  const indiceArroba = correo.indexOf("@");
  if (indiceArroba <= 0 || indiceArroba === correo.length - 1) {
    return false;
  }
  const dominio = correo.slice(indiceArroba + 1);
  return dominio.includes(".");
}

/** Valida la contraseña y devuelve el mensaje de error, o null si es válida. */
function validarContrasena(password: string): string | null {
  if (!password) {
    return ERROR_CONTRASENA_CORTA;
  }
  if (password.length < 8) {
    return ERROR_CONTRASENA_CORTA;
  }
  return null;
}

/** Cuerpo del formulario de registro. */
function FormularioRegistro({
  correo,
  setCorreo,
  password,
  setPassword,
  errorCorreo,
  errorPassword,
  errorGeneral,
  cargando,
  puedeRegistrar,
  registrar,
  irAlLogin,
}: {
  correo: string;
  setCorreo: (texto: string) => void;
  password: string;
  setPassword: (texto: string) => void;
  errorCorreo: string | null;
  errorPassword: string | null;
  errorGeneral: string | null;
  cargando: boolean;
  puedeRegistrar: boolean;
  registrar: () => void;
  irAlLogin: () => void;
}): ReactNode {
  return (
    <View style={styles.formulario}>
      <CampoTexto
        etiqueta="Correo electrónico"
        etiquetaAccesible={ETIQUETA_CORREO}
        valor={correo}
        onCambioTexto={setCorreo}
        error={errorCorreo}
        teclado="email-address"
        retornoTecla="next"
      />
      <CampoTexto
        etiqueta="Contraseña"
        etiquetaAccesible={ETIQUETA_CONTRASENA}
        valor={password}
        onCambioTexto={setPassword}
        error={errorPassword}
        entradaSegura
        retornoTecla="done"
      />
      {errorGeneral !== null && (
        <Text allowFontScaling maxFontSizeMultiplier={1.4} style={styles.error}>
          {errorGeneral}
        </Text>
      )}
      <Boton
        etiquetaAccesible={ETIQUETA_REGISTRAR}
        onPress={registrar}
        deshabilitado={!puedeRegistrar || cargando}
        pistaAccesible={PISTA_REGISTRAR}
        texto={TEXTO_REGISTRAR}
      />
      <View style={styles.enlaces}>
        <Pressable
          accessibilityLabel={ETIQUETA_ENLACE_LOGIN}
          accessibilityRole="button"
          onPress={irAlLogin}
          style={styles.enlacePresionable}
        >
          <Text
            accessibilityRole="text"
            allowFontScaling
            maxFontSizeMultiplier={2}
            style={styles.textoEnlace}
          >
            {TEXTO_ENLACE_LOGIN}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Pantalla de registro: correo, contraseña, botón «Registrar» y enlace a login. */
export default function PantallaRegistro(): ReactNode {
  const { cargando, registrar } = useSesion();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const manejarCambioCorreo = useCallback((texto: string): void => {
    setCorreo(texto);
    setErrorCorreo(validarCorreo(texto));
  }, []);

  const manejarCambioPassword = useCallback((texto: string): void => {
    setPassword(texto);
    setErrorPassword(validarContrasena(texto));
  }, []);

  const puedeRegistrar = useMemo((): boolean => {
    return !errorCorreo && !errorPassword && correo.length > 0 && password.length >= 8;
  }, [correo, password, errorCorreo, errorPassword]);

  const manejarRegistro = useCallback(async (): Promise<void> => {
    setErrorGeneral(null);
    if (!puedeRegistrar) {
      return;
    }
    try {
      await registrar(correo, password);
      void router.push("/(tabs)");
    } catch (fallo) {
      if (!(fallo instanceof Error)) {
        setErrorGeneral("No se pudo completar el registro.");
        return;
      }
      if (fallo.message === ERROR_CORREO_REPETIDO) {
        setErrorCorreo(ERROR_CORREO_REPETIDO);
        return;
      }
      setErrorGeneral(fallo.message);
    }
  }, [correo, password, puedeRegistrar, registrar]);

  const irAlLogin = useCallback((): void => {
    void router.push("/login");
  }, [router]);

  let comportamientoTeclado: "padding" | undefined;
  if (Platform.OS === "ios") {
    comportamientoTeclado = "padding";
  } else {
    comportamientoTeclado = undefined;
  }

  return (
    <PantallaConAviso>
      <TituloPantalla>Crear cuenta</TituloPantalla>
      <KeyboardAvoidingView behavior={comportamientoTeclado} style={styles.teclado}>
        <FormularioRegistro
          correo={correo}
          setCorreo={manejarCambioCorreo}
          password={password}
          setPassword={manejarCambioPassword}
          errorCorreo={errorCorreo}
          errorPassword={errorPassword}
          errorGeneral={errorGeneral}
          cargando={cargando}
          puedeRegistrar={puedeRegistrar}
          registrar={manejarRegistro}
          irAlLogin={irAlLogin}
        />
      </KeyboardAvoidingView>
    </PantallaConAviso>
  );
}

const styles = StyleSheet.create({
  teclado: {
    flex: 1,
  },
  formulario: {
    backgroundColor: COLOR.superficie,
    borderColor: COLOR.borde,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    gap: ESPACIO.lg,
    padding: ESPACIO.xl,
  },
  campo: {
    gap: 4,
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
  },
  enlaces: {
    alignItems: "center",
    gap: 4,
    marginTop: ESPACIO.sm,
  },
  enlacePresionable: {
    paddingVertical: 8,
  },
  textoEnlace: {
    color: COLOR.marca,
    fontSize: 16,
    fontWeight: "700",
  },
});
