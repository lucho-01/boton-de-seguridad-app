/** Repositorio local de alertas para el historial (M12). */

import type { SQLiteDatabase } from "expo-sqlite";

import { abrirBase } from "@/db/abrirBase";
import type { Alerta } from "@/models";

type BaseRepositorio = Pick<SQLiteDatabase, "getAllAsync" | "runAsync">;

export interface AlertasRepository {
  listar(): Promise<Alerta[]>;
  obtenerPorId(id: string): Promise<Alerta | null>;
  guardar(alerta: Alerta): Promise<void>;
  marcarBorrado(id: string, ahora: Date): Promise<void>;
}

export class AlertasRepositorySqlite implements AlertasRepository {
  private readonly basePromise: Promise<BaseRepositorio> | null;

  constructor(basePromise?: Promise<BaseRepositorio>) {
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

  async obtenerPorId(id: string): Promise<Alerta | null> {
    const base = await this.obtenerBase();
    const filas = await base.getAllAsync<Alerta>(
      `SELECT id, remote_id, created_at, updated_at, deleted_at, pending, deleted,
              lat, lng, precision_m, bateria_pct, estado, creada_en
       FROM alerta
       WHERE id = ? AND deleted = 0`,
      [id],
    );
    if (filas.length === 0) {
      return null;
    }
    return filas[0];
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

  async marcarBorrado(id: string, ahora: Date): Promise<void> {
    const base = await this.obtenerBase();
    const timestamp = ahora.toISOString();
    await base.runAsync(
      `UPDATE alerta
       SET deleted = 1, deleted_at = ?, pending = 1, updated_at = ?
       WHERE id = ? AND deleted = 0`,
      [timestamp, timestamp, id],
    );
  }

  private async obtenerBase(): Promise<BaseRepositorio> {
    if (this.basePromise !== null) {
      return this.basePromise;
    }
    return abrirBase();
  }
}
