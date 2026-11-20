/**
 * Repositorio de contactos de confianza (M4).
 *
 * Implementación sobre `expo-sqlite` con SQL parametrizado (`?`), nunca
 * concatenación de strings con datos. Implementa la interfaz `ContactosRepository`
 * para que el controlador (y las pruebas con un doble en memoria) no dependan
 * de SQLite directamente.
 */

import type { SQLiteDatabase } from "expo-sqlite";
import { abrirBase } from "@/db/abrirBase";
import type { ContactoConfianza } from "@/services/contactos";

type BaseRepositorio = Pick<SQLiteDatabase, "getAllAsync" | "runAsync">;

/** Interfaz del repositorio: implementable con SQLite o con un doble en pruebas. */
export interface ContactosRepository {
  /** Lista los contactos no borrados, ordenados por nombre. */
  listar(): Promise<ContactoConfianza[]>;
  /** Devuelve un contacto por id, o `null` si no existe o está borrado. */
  obtenerPorId(id: string): Promise<ContactoConfianza | null>;
  /** Guarda o reemplaza un contacto con `pending = 1`. */
  guardar(contacto: ContactoConfianza): Promise<ContactoConfianza>;
  /** Marca el contacto como borrado lógicamente (`deleted = 1`). */
  marcarBorrado(id: string, ahora: Date): Promise<void>;
  /** Marca al contacto como principal y desmarca a todos los demás (`principal = 1` solo en este). */
  marcarPrincipal(id: string, ahora: Date): Promise<void>;
}

/** Fila leída de la base de datos (tipos de SQLite son laxos, se hace cast). */
interface FilaContacto {
  id: string;
  nombre: string;
  telefono: string;
  parentesco: string | null;
  remote_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pending: number;
  deleted: number;
  principal: number;
}

/** Repositorio de contactos sobre SQLite. */
export class ContactosRepositorySqlite implements ContactosRepository {
  constructor(private readonly basePromise: Promise<BaseRepositorio> = abrirBase()) {}

  async listar(): Promise<ContactoConfianza[]> {
    const base = await this.basePromise;
    const filas = await base.getAllAsync<FilaContacto>(
      `SELECT id, nombre, telefono, parentesco, remote_id, created_at,
              updated_at, deleted_at, pending, deleted, principal
       FROM contacto_confianza
       WHERE deleted = 0
       ORDER BY LOWER(nombre)`,
    );
    return filas.map((fila) => filaDeContacto(fila));
  }

  async obtenerPorId(id: string): Promise<ContactoConfianza | null> {
    const base = await this.basePromise;
    const filas = await base.getAllAsync<FilaContacto>(
      `SELECT id, nombre, telefono, parentesco, remote_id, created_at,
              updated_at, deleted_at, pending, deleted, principal
       FROM contacto_confianza
       WHERE id = ? AND deleted = 0`,
      [id],
    );
    if (filas.length === 0) {
      return null;
    }
    return filaDeContacto(filas[0]);
  }

  async guardar(contacto: ContactoConfianza): Promise<ContactoConfianza> {
    const base = await this.basePromise;
    await base.runAsync(
      `INSERT OR REPLACE INTO contacto_confianza
        (id, nombre, telefono, parentesco, remote_id, created_at,
         updated_at, deleted_at, pending, deleted, principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contacto.id,
        contacto.nombre,
        contacto.telefono,
        contacto.parentesco,
        contacto.remote_id,
        contacto.created_at,
        contacto.updated_at,
        contacto.deleted_at,
        contacto.pending,
        contacto.deleted,
        contacto.principal,
      ],
    );
    return contacto;
  }

  async marcarBorrado(id: string, ahora: Date): Promise<void> {
    const base = await this.basePromise;
    await base.runAsync(
      `UPDATE contacto_confianza
       SET deleted = 1, deleted_at = ?, pending = 1, updated_at = ?
       WHERE id = ?`,
      [ahora.toISOString(), ahora.toISOString(), id],
    );
  }

  async marcarPrincipal(id: string, ahora: Date): Promise<void> {
    const base = await this.basePromise;
    await base.runAsync(
      `UPDATE contacto_confianza
       SET principal = CASE WHEN id = ? THEN 1 ELSE 0 END,
           updated_at = ?, pending = 1
       WHERE deleted = 0
         AND EXISTS (
           SELECT 1 FROM contacto_confianza
           WHERE id = ? AND deleted = 0
         )
         AND (id = ? OR principal = 1)`,
      [id, ahora.toISOString(), id, id],
    );
  }
}

/** Convierte una fila de SQLite en un `ContactoConfianza` tipado. */
function filaDeContacto(fila: FilaContacto): ContactoConfianza {
  let pending = 0;
  if (fila.pending === 1) {
    pending = 1;
  }
  let deleted = 0;
  if (fila.deleted === 1) {
    deleted = 1;
  }
  let principal = 0;
  if (fila.principal === 1) {
    principal = 1;
  }
  return {
    id: fila.id,
    nombre: fila.nombre,
    telefono: fila.telefono,
    parentesco: fila.parentesco,
    remote_id: fila.remote_id,
    created_at: fila.created_at,
    updated_at: fila.updated_at,
    deleted_at: fila.deleted_at,
    pending,
    deleted,
    principal,
  };
}
