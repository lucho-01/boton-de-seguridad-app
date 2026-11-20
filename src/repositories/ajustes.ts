/**
 * Repositorio de ajustes (M6).
 *
 * Implementación sobre `expo-sqlite` con SQL parametrizado (`?`), nunca
 * concatenación de strings con datos. Implementa la interfaz
 * `AjustesRepository` para que el controlador (y las pruebas con un doble en
 * memoria) no dependan de SQLite directamente.
 *
 * La tabla `ajustes` (`clave TEXT PRIMARY KEY, valor TEXT NOT NULL`) se crea
 * en la migración de `src/db/abrirBase.ts`.
 */

import type { SQLiteDatabase } from "expo-sqlite";
import { abrirBase } from "@/db/abrirBase";

/** Interfaz del repositorio: implementable con SQLite o con un doble en pruebas. */
export interface AjustesRepository {
  /** Lee el valor de una clave, o `null` si no existe. */
  obtenerClave(clave: string): Promise<string | null>;
  /** Inserta o reemplaza el valor de una clave (`INSERT OR REPLACE`). */
  guardarClave(clave: string, valor: string): Promise<void>;
}

/** Fila leída de la tabla de ajustes. */
interface FilaAjuste {
  clave: string;
  valor: string;
}

/** Repositorio de ajustes sobre SQLite. */
export class AjustesRepositorySqlite implements AjustesRepository {
  constructor(private readonly basePromise: Promise<SQLiteDatabase> = abrirBase()) {}

  async obtenerClave(clave: string): Promise<string | null> {
    const base = await this.basePromise;
    const filas = await base.getAllAsync<FilaAjuste>(
      `SELECT clave, valor FROM ajustes WHERE clave = ?`,
      [clave],
    );
    if (filas.length === 0) {
      return null;
    }
    return filas[0].valor;
  }

  async guardarClave(clave: string, valor: string): Promise<void> {
    const base = await this.basePromise;
    await base.runAsync(`INSERT OR REPLACE INTO ajustes (clave, valor) VALUES (?, ?)`, [
      clave,
      valor,
    ]);
  }
}
