import { LIMITE_MENSAJE_SMS, componerMensajeSms, crearEnlaceMapa } from "@/services/mensaje";

describe("servicio de mensaje SMS · M10", () => {
  it("crea el enlace de mapa con las coordenadas", () => {
    expect(crearEnlaceMapa(4.71, -74.07)).toBe("https://maps.google.com/?q=4.71,-74.07");
  });

  it("con ubicación incluye el enlace y conserva el límite", () => {
    const resultado = componerMensajeSms({
      mensajeBase: "Texto largo de emergencia ".repeat(10) + "[enlace de mapa]",
      lat: 4.71,
      lng: -74.07,
      bateriaPct: 84,
    });

    expect(resultado.tieneUbicacion).toBe(true);
    expect(resultado.mensaje).toContain("https://maps.google.com/?q=4.71,-74.07");
    expect(resultado.mensaje).toContain("Bateria: 84%");
    expect(resultado.longitud).toBeLessThanOrEqual(LIMITE_MENSAJE_SMS);
  });

  it("sin ubicación indica claramente que no hay mapa", () => {
    const resultado = componerMensajeSms({
      mensajeBase: "Necesito ayuda. [enlace de mapa]",
      lat: null,
      lng: null,
      bateriaPct: null,
    });

    expect(resultado.tieneUbicacion).toBe(false);
    expect(resultado.mensaje).toContain("Sin ubicación disponible");
    expect(resultado.mensaje).not.toContain("http");
  });

  it("con mensaje base vacío sigue produciendo texto válido", () => {
    const resultado = componerMensajeSms({
      mensajeBase: "",
      lat: 1,
      lng: 2,
      bateriaPct: null,
    });

    expect(resultado.mensaje).toContain("https://maps.google.com/?q=1,2");
  });
});
