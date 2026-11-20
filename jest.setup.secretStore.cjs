/**
 * Almacén en memoria que respalda el mock de `expo-secure-store`.
 *
 * Las pruebas del `tokenStore` y del controller de sesión lo vacían entre casos
 * con `resetSecureStore` y pueden revisar las claves con `clavesGuardadas`.
 * No contiene ningún dato real ni credencial.
 */
const almacen = new Map();

function leerClave(clave) {
  const valor = almacen.get(clave);
  if (valor === undefined) {
    return null;
  }
  return valor;
}

function escribirClave(clave, valor) {
  almacen.set(clave, valor);
}

function borrarClave(clave) {
  almacen.delete(clave);
}

function resetSecureStore() {
  almacen.clear();
}

function clavesGuardadas() {
  return [...almacen.keys()];
}

module.exports = {
  leerClave,
  escribirClave,
  borrarClave,
  resetSecureStore,
  clavesGuardadas,
};
