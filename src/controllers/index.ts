/**
 * Controladores de la app. Las pantallas importan de aquí o de
 * `@/controllers/sesionContext`, nunca de `src/api` (regla de capas).
 */

export { SesionProvider, useSesion } from "./sesionContext";
export { useSesionController, type EstadoApi, type SesionController } from "./useSesionController";
export {
  useArmadoController,
  ANUNCIO_CUENTA,
  ANUNCIO_CANCELADA,
  SEGUNDOS_CUENTA,
  type ArmadoController,
  type EstadoArmado,
} from "./useArmadoController";

export {
  useContactosController,
  type ContactosController,
  type DatosContacto,
  type ErrorCampo,
  type ResultadoGuardado,
  type ContactoConfianza,
} from "./useContactosController";

export { esPrincipal } from "@/services/contactos";
