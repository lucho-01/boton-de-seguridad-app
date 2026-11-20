/**
 * Controlador de contactos de confianza (M4 y M5).
 *
 * Une el servicio puro de validaciones y el repositorio de contactos.
 * El repositorio es inyectable: por defecto usa SQLite, y las pruebas pueden
 * pasar un doble en memoria sin tocar la base de datos.
 *
 * Estados explícitos: la lista se carga al montar y se refresca tras cada
 * escritura. El aviso guarda el último mensaje de resultado para que la vista
 * lo muestre una vez.
 */

import { useCallback, useEffect, useState } from "react";

import { ContactosRepositorySqlite, type ContactosRepository } from "@/repositories/contactos";
import {
  actualizarCampos,
  crearContactoNuevo,
  ordenarPorNombre,
  validarContacto,
  togglePrincipal as togglePrincipalServicio,
  type ContactoConfianza,
  ERROR_ESCRITURA,
  MENSAJE_BORRADO,
  MENSAJE_EDITADO,
  MENSAJE_GUARDADO,
} from "@/services/contactos";

export type { ContactoConfianza } from "@/services/contactos";

/** Datos que entrega el formulario al guardar. */
export interface DatosContacto {
  nombre: string;
  telefono: string;
  parentesco: string;
  /** 0 para un contacto nuevo; el contacto editado trae su valor actual. */
  principal: number;
}

/** Error de un campo del formulario. */
export interface ErrorCampo {
  campo: "nombre" | "telefono" | "parentesco";
  mensaje: string;
}

/** Resultado de guardar: éxito con mensaje, o fallo con errores por campo. */
export type ResultadoGuardado =
  { ok: true; mensaje: string } | { ok: false; errores: ErrorCampo[] };

/** Controlador de contactos: lista, carga, guardar, eliminar y aviso. */
export interface ContactosController {
  /** Contactos no borrados, ordenados por nombre. */
  contactos: ContactoConfianza[];
  /** `true` mientras se carga la lista desde SQLite. */
  cargando: boolean;
  /** `true` si aún se puede agregar un contacto (menos de 5). */
  puedeAgregar: boolean;
  /** Último mensaje de resultado para mostrar en pantalla (o `null`). */
  aviso: string | null;
  /** Guarda o edita un contacto (id opcional: sin id es alta, con id es edición). */
  guardar: (datos: DatosContacto, id?: string) => Promise<ResultadoGuardado>;
  /** Marca un contacto como borrado lógicamente; devuelve `true` si lo logró. */
  eliminar: (id: string) => Promise<boolean>;
  /** Vuelve a leer la lista desde el repositorio. */
  refrescar: () => Promise<void>;
  /** Limpia el aviso mostrado en pantalla. */
  limpiarAviso: () => void;
  /** Devuelve un contacto por id para editarlo, o `null` si no existe. */
  obtenerContacto: (id: string) => ContactoConfianza | null;
  /** Devuelve el contacto principal actual, o `null` si no hay ninguno. */
  obtenerPrincipal: () => ContactoConfianza | null;
  /** Marca el contacto como principal (exclusividad: solo uno a la vez, R3). */
  marcarPrincipal: (id: string, ahora?: Date) => Promise<void>;
  /** Alterna el estado principal de un contacto (toggle, R2 y R3). */
  togglePrincipal: (id: string, ahora?: Date) => Promise<void>;
}

/**
 * Busca un contacto por id en una lista, o devuelve `null` si no existe.
 */
function obtenerContactoDeLista(
  contactos: ContactoConfianza[],
  id: string,
): ContactoConfianza | null {
  return contactos.find((c) => c.id === id) ?? null;
}

/** Devuelve el contacto principal actual, o `null` si no hay ninguno. */
function obtenerPrincipalDeLista(contactos: ContactoConfianza[]): ContactoConfianza | null {
  for (let i = 0; i < contactos.length; i += 1) {
    if (contactos[i].principal === 1) {
      return contactos[i];
    }
  }
  return null;
}

/**
 * Guarda o edita un contacto tras validarlo con el servicio puro.
 * Función de nivel de módulo para mantener el hook por debajo del límite de líneas.
 */
async function guardarContacto(
  base: ContactosRepository,
  contactos: ContactoConfianza[],
  refrescar: () => Promise<void>,
  setAviso: (mensaje: string | null) => void,
  datos: DatosContacto,
  id?: string,
  ahora: Date = new Date(),
): Promise<ResultadoGuardado> {
  let contactoOriginal: ContactoConfianza | null = null;
  if (id !== null && id !== undefined) {
    contactoOriginal = await base.obtenerPorId(id);
  }
  const existentes = contactos.filter((c) => c.id !== id);

  const validacion = validarContacto({
    nombre: datos.nombre,
    telefono: datos.telefono,
    parentesco: datos.parentesco,
    idOriginal: id ?? null,
    existentes,
    ahora,
    principal: datos.principal,
  });

  if (!validacion.ok) {
    return { ok: false, errores: validacion.errores };
  }

  let contactoGuardado: ContactoConfianza;
  if (contactoOriginal === null) {
    contactoGuardado = crearContactoNuevo(validacion.datos!, ahora);
  } else {
    contactoGuardado = actualizarCampos(contactoOriginal, validacion.datos!, ahora);
  }

  try {
    await base.guardar(contactoGuardado);
    await refrescar();
    let mensaje: string;
    if (contactoOriginal === null) {
      mensaje = MENSAJE_GUARDADO;
    } else {
      mensaje = MENSAJE_EDITADO;
    }
    setAviso(mensaje);
    return { ok: true, mensaje };
  } catch {
    return {
      ok: false,
      errores: [{ campo: "nombre", mensaje: ERROR_ESCRITURA }],
    };
  }
}

/** Marca un contacto como borrado lógicamente y refresca la lista. */
async function eliminarContacto(
  base: ContactosRepository,
  refrescar: () => Promise<void>,
  setAviso: (mensaje: string | null) => void,
  id: string,
  ahora: Date = new Date(),
): Promise<boolean> {
  const existe = await base.obtenerPorId(id);
  if (existe === null) {
    return false;
  }
  try {
    await base.marcarBorrado(id, ahora);
    await refrescar();
    setAviso(MENSAJE_BORRADO);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook de contactos: lista, carga, guardar, eliminar, marcar principal.
 * El repositorio es inyectable: por defecto usa SQLite.
 */
export function useContactosController(repositorio?: ContactosRepository): ContactosController {
  const base = repositorio ?? new ContactosRepositorySqlite();
  const [contactos, setContactos] = useState<ContactoConfianza[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  /** Lee la lista desde el repositorio y la deja ordenada por nombre. */
  const refrescar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const lista = await base.listar();
      setContactos(ordenarPorNombre(lista));
    } finally {
      setCargando(false);
    }
  }, [base]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  /** Guarda o edita un contacto tras validarlo con el servicio puro. */
  const guardar = useCallback(
    async (datos: DatosContacto, id?: string): Promise<ResultadoGuardado> => {
      return guardarContacto(base, contactos, refrescar, setAviso, datos, id);
    },
    [base, contactos, refrescar, setAviso],
  );

  /** Marca un contacto como borrado lógicamente y refresca la lista. */
  const eliminar = useCallback(
    async (id: string): Promise<boolean> => {
      return eliminarContacto(base, refrescar, setAviso, id);
    },
    [base, refrescar, setAviso],
  );

  const limpiarAviso = useCallback(() => {
    setAviso(null);
  }, []);

  const puedeAgregar = contactos.length < 5;
  const obtenerContacto = (id: string): ContactoConfianza | null =>
    obtenerContactoDeLista(contactos, id);
  const obtenerPrincipal = (): ContactoConfianza | null => obtenerPrincipalDeLista(contactos);

  const marcarPrincipal = useCallback(
    async (id: string, ahora: Date = new Date()): Promise<void> => {
      await base.marcarPrincipal(id, ahora);
      await refrescar();
    },
    [base, refrescar],
  );

  const togglePrincipal = useCallback(
    async (id: string, ahora: Date = new Date()): Promise<void> => {
      const contacto = obtenerContacto(id);
      if (contacto === null) {
        return;
      }
      const actualizados = togglePrincipalServicio(contactos, id, ahora);
      for (let i = 0; i < actualizados.length; i += 1) {
        await base.guardar(actualizados[i]);
      }
      await refrescar();
    },
    [base, contactos, obtenerContacto, refrescar],
  );

  return {
    contactos,
    cargando,
    puedeAgregar,
    aviso,
    guardar,
    eliminar,
    refrescar,
    limpiarAviso,
    obtenerContacto,
    obtenerPrincipal,
    marcarPrincipal,
    togglePrincipal,
  };
}
