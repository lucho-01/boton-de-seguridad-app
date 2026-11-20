/**
 * Vista de la sesión: el contrato `Sesion` incluye los tokens, la pantalla solo
 * necesita el correo. La función extrae el correo sin exponer nunca el token.
 */
export interface SesionConUsuario {
  usuario: { email: string };
}

/** Correo de la sesión activa, o `null` si no hay sesión. */
export function correoDeSesion(sesion: SesionConUsuario | null): string | null {
  if (sesion === null) {
    return null;
  }
  return sesion.usuario.email;
}
