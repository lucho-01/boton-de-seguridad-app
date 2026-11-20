import { crearAlerta } from "@/services/alertas";

describe("servicio de alertas · M12", () => {
  it("crea una alerta sincronizable con hora inyectada y UUID", () => {
    const ahora = new Date("2026-11-20T22:00:00.000Z");
    const alerta = crearAlerta(
      {
        estado: "mensaje_preparado",
        lat: 4.71,
        lng: -74.07,
        precision_m: 12,
        bateria_pct: 84,
      },
      ahora,
    );

    expect(alerta.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(alerta.created_at).toBe(ahora.toISOString());
    expect(alerta.estado).toBe("mensaje_preparado");
    expect(alerta.pending).toBe(1);
    expect(alerta.deleted).toBe(0);
    expect(alerta.lat).toBe(4.71);
    expect(alerta.bateria_pct).toBe(84);
  });
});
