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

export interface AlertasSyncRepository extends AlertasRepository {
  listarPendientes(): Promise<Alerta[]>;
  guardarDesdeApi(alerta: Alerta): Promise<void>;
  confirmarSubida(alerta: Alerta, updatedAtLocal: string): Promise<void>;
  marcarSincronizado(id: string, updatedAtLocal: string): Promise<void>;
}

export class AlertasRepositorySqlite implements AlertasSyncRepository {
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

  async listarPendientes(): Promise<Alerta[]> {
    const base = await this.obtenerBase();
    return base.getAllAsync<Alerta>(
      `SELECT id, remote_id, created_at, updated_at, deleted_at, pending, deleted,
              lat, lng, precision_m, bateria_pct, estado, creada_en
       FROM alerta
       WHERE pending = 1
       ORDER BY updated_at, id`,
    );
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

  async guardarDesdeApi(alerta: Alerta): Promise<void> {
    const base = await this.obtenerBase();
    await base.runAsync(
      `INSERT INTO alerta
        (id, remote_id, created_at, updated_at, deleted_at, pending, deleted,
         lat, lng, precision_m, bateria_pct, estado, creada_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         remote_id = excluded.remote_id,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         pending = excluded.pending,
         deleted = excluded.deleted,
         lat = excluded.lat,
         lng = excluded.lng,
         precision_m = excluded.precision_m,
         bateria_pct = excluded.bateria_pct,
         estado = excluded.estado,
         creada_en = excluded.creada_en
       WHERE (alerta.pending = 0 AND excluded.updated_at >= alerta.updated_at)
          OR excluded.updated_at > alerta.updated_at`,
      valoresAlerta(alerta),
    );
  }

  async confirmarSubida(alerta: Alerta, updatedAtLocal: string): Promise<void> {
    const base = await this.obtenerBase();
    await base.runAsync(
      `UPDATE alerta
       SET remote_id = ?, created_at = ?, updated_at = ?, deleted_at = ?,
           pending = 0, deleted = ?, lat = ?, lng = ?, precision_m = ?,
           bateria_pct = ?, estado = ?, creada_en = ?
       WHERE id = ? AND updated_at = ? AND pending = 1`,
      [
        alerta.remote_id,
        alerta.created_at,
        alerta.updated_at,
        alerta.deleted_at,
        alerta.deleted,
        alerta.lat,
        alerta.lng,
        alerta.precision_m,
        alerta.bateria_pct,
        alerta.estado,
        alerta.creada_en,
        alerta.id,
        updatedAtLocal,
      ],
    );
  }

  async marcarSincronizado(id: string, updatedAtLocal: string): Promise<void> {
    const base = await this.obtenerBase();
    await base.runAsync(
      `UPDATE alerta
       SET remote_id = ?, pending = 0
       WHERE id = ? AND updated_at = ? AND pending = 1 AND deleted = 1`,
      [id, id, updatedAtLocal],
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

function valoresAlerta(alerta: Alerta): (string | number | null)[] {
  return [
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
  ];
}
