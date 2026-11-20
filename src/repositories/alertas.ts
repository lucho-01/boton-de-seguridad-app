/** Repositorio local de alertas para el historial (M12). */

import type { SQLiteDatabase } from "expo-sqlite";

import { abrirBase } from "@/db/abrirBase";
import type { Alerta } from "@/models";

export interface AlertasRepository {
  listar(): Promise<Alerta[]>;
  guardar(alerta: Alerta): Promise<void>;
}

export class AlertasRepositorySqlite implements AlertasRepository {
  private readonly basePromise: Promise<SQLiteDatabase> | null;

  constructor(basePromise?: Promise<SQLiteDatabase>) {
    this.basePromise = basePromise ?? null;
  }

  async listar(): Promise<Alerta[]> {
    const base = await this.obtenerBase();
    const filas = await base.getAllAsync<Alerta>(
      `SELECT id, remote_id, created_at, updated_at, deleted_at, pending, deleted,
              lat, lng, precision_m, bateria_pct, estado, creada_en
       FROM alerta
       WHERE deleted = 0
       ORDER BY creada_en DESC`,
    );
    return filas;
  }

  async guardar(alerta: Alerta): Promise<void> {
    const base = await this.obtenerBase();
    await base.runAsync(
      `INSERT OR REPLACE INTO alerta
        (id, remote_id, created_at, updated_at, deleted_at, pending, deleted,
         lat, lng, precision_m, bateria_pct, estado, creada_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alerta.id,
        alerta.remote_id,
        alerta.created_at,
        alerta.updated_at,
        alerta.deleted_at,
        alerta.pending,
        alerta.deleted,
        alerta.lat,
        alerta.lng,
        alerta.precision_m,
        alerta.bateria_pct,
        alerta.estado,
        alerta.creada_en,
      ],
    );
  }

  private async obtenerBase(): Promise<SQLiteDatabase> {
    if (this.basePromise !== null) {
      return this.basePromise;
    }
    return abrirBase();
  }
}
