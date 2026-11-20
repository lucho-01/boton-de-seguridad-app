import type { Alerta, EstadoAlerta } from "@/models";

export interface DatosNuevaAlerta {
  estado: EstadoAlerta;
  lat: number | null;
  lng: number | null;
  precision_m: number | null;
  bateria_pct: number | null;
}

export function crearAlerta(datos: DatosNuevaAlerta, ahora: Date): Alerta {
  const timestamp = ahora.toISOString();
  return {
    id: generarUuid(),
    remote_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    pending: 1,
    deleted: 0,
    lat: datos.lat,
    lng: datos.lng,
    precision_m: datos.precision_m,
    bateria_pct: datos.bateria_pct,
    estado: datos.estado,
    creada_en: timestamp,
  };
}

function generarUuid(): string {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (letra) => {
    const aleatorio = Math.floor(Math.random() * 16);
    let valor = aleatorio;
    if (letra === "y") {
      valor = (aleatorio & 3) | 8;
    }
    return valor.toString(16);
  });
}
