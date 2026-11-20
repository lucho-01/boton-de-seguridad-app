/**
 * Apertura y migración de la base de datos SQLite (M4, M5 y M6).
 *
 * La base se abre una sola vez y se reutiliza desde un módulo cacheado, para
 * no tener varias instancias abiertas al mismo tiempo. La migración es
 * idempotente: `CREATE TABLE IF NOT EXISTS` no falla si la tabla ya existe, y
 * `ALTER TABLE ... ADD COLUMN` se envuelve en try/catch para no fallar si la
 * columna ya existe.
 *
 * M4 y M5 usan la tabla `contacto_confianza`; M6 añade la tabla `ajustes`
 * (clave/valor para persistencia local de sensibilidad y mensaje base).
 * M12 añade la tabla de alertas para el historial local.
 */

import { openDatabaseSync } from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

/** Nombre del archivo de base de datos local. */
const NOMBRE_BASE = "boton_de_seguridad.db";

/** Base abierta (una sola instancia durante toda la vida de la app). */
let baseDeDatos: SQLiteDatabase | null = null;
/** Promesa de apertura: evita abrir dos veces al mismo tiempo. */
let promesaBase: Promise<SQLiteDatabase> | null = null;

/** Abre la base y ejecuta la migración; devuelve siempre la misma instancia. */
export async function abrirBase(): Promise<SQLiteDatabase> {
  if (baseDeDatos !== null) {
    return baseDeDatos;
  }
  if (promesaBase !== null) {
    return promesaBase;
  }
  promesaBase = (async () => {
    const base = openDatabaseSync(NOMBRE_BASE);
    await migrar(base);
    baseDeDatos = base;
    return base;
  })();
  return promesaBase;
}

/** Crea la tabla de contactos si todavía no existe (idempotente). */
async function migrar(base: SQLiteDatabase): Promise<void> {
  await base.execAsync(
    `CREATE TABLE IF NOT EXISTS contacto_confianza (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      parentesco TEXT,
      remote_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      pending INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      principal INTEGER NOT NULL DEFAULT 0
    );`,
  );

  /** Añade la tabla de ajustes (clave/valor) de M6 (idempotente). */
  await base.execAsync(
    `CREATE TABLE IF NOT EXISTS ajustes (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );`,
  );

  await base.execAsync(
    `CREATE TABLE IF NOT EXISTS alerta (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      pending INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      lat REAL,
      lng REAL,
      precision_m REAL,
      bateria_pct INTEGER,
      estado TEXT NOT NULL CHECK (estado IN ('cancelada', 'mensaje_preparado')),
      creada_en TEXT NOT NULL
    );`,
  );

  /** Añade la columna `principal` a bases creadas antes de M5 (idempotente). */
  try {
    await base.execAsync(
      `ALTER TABLE contacto_confianza ADD COLUMN principal INTEGER NOT NULL DEFAULT 0;`,
    );
  } catch {
    /* La columna ya existe: no hay nada que hacer. */
  }
}
