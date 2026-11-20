/**
 * Punto de entrada del cliente HTTP: `src/controllers` importa `@/api`.
 *
 * Los esquemas viven en `src/api/contracts` (zona del orquestador); aquí solo
 * viven la configuración, el error, los tokens, el núcleo y los endpoints.
 */

export { obtenerApiUrl, resolverApiUrl, type ResultadoUrl } from "./config";
export {
  ApiError,
  aApiError,
  errorDeRespuesta,
  errorDeValidacion,
  errorSinRespuesta,
  type MotivoApi,
} from "./errors";
export {
  CLAVE_REFRESH_TOKEN,
  CLAVE_TOKEN,
  borrarTokens,
  guardarTokens,
  leerTokens,
  type TokensGuardados,
} from "./tokenStore";
export {
  MS_TIEMPO_LIMITE,
  peticion,
  refrescarTokens,
  sesionDeRespuesta,
  type Cabeceras,
  type OpcionesPeticion,
  type ResultadoRefresh,
  type TipoFetchCache,
} from "./http";
export {
  cerrarSesion,
  comprobarHealth,
  iniciarSesion,
  obtenerUsuarioActual,
  registrarCuenta,
  type Credenciales,
  type EstadoServidor,
} from "./auth";
export {
  borrarAlertaApi,
  borrarContactoApi,
  guardarAlertaApi,
  guardarContactoApi,
  obtenerAlertas,
  obtenerContactos,
  type AlertaApi,
  type ContactoApi,
  type PaginaAlertas,
  type PaginaContactos,
} from "./sync";
