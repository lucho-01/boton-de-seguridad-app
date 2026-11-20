import { fireEvent, render, screen } from "@testing-library/react-native";

import { ContenidoArmado } from "@/components/ContenidoArmado";

describe("Pantalla SOS · M10", () => {
  it("muestra la vista previa y abre solo al pulsar el botón", async () => {
    const abrirRedactor = jest.fn(async () => true);
    await render(
      <ContenidoArmado
        estado="lista"
        onVolverAlInicio={jest.fn()}
        ubicacion={{ latitud: 4.71, longitud: -74.07, precision: 10 }}
        ubicacionFallida={false}
        sms={{
          disponible: true,
          mensaje: "Necesito ayuda. https://maps.google.com/?q=4.71,-74.07",
          longitudMensaje: 60,
          tieneUbicacion: true,
          puedeAbrir: true,
          puedeCopiar: false,
          aviso: null,
          avisoCopia: null,
          abrirRedactor,
          copiarMensaje: jest.fn(async () => false),
        }}
      />,
    );

    expect(screen.getByText(/Necesito ayuda/)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Copiar mensaje de alerta")).toBeNull();
    fireEvent.press(screen.getByLabelText("Abrir mensaje para enviar"));
    expect(abrirRedactor).toHaveBeenCalledTimes(1);
  });

  it("deshabilita el botón y explica que falta un contacto", async () => {
    await render(
      <ContenidoArmado
        estado="lista"
        onVolverAlInicio={jest.fn()}
        ubicacion={null}
        ubicacionFallida={true}
        sms={{
          disponible: true,
          mensaje: "Sin ubicación disponible.",
          longitudMensaje: 27,
          tieneUbicacion: false,
          puedeAbrir: false,
          puedeCopiar: false,
          aviso: "Agrega al menos un contacto de confianza para enviar el mensaje.",
          avisoCopia: null,
          abrirRedactor: async () => false,
          copiarMensaje: async () => false,
        }}
      />,
    );

    expect(screen.getByText(/Agrega al menos/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Abrir mensaje para enviar")).toBeDisabled();
  });

  it("ofrece copiar cuando SMS no está disponible", async () => {
    const copiarMensaje = jest.fn(async () => true);
    await render(
      <ContenidoArmado
        estado="lista"
        onVolverAlInicio={jest.fn()}
        ubicacion={null}
        ubicacionFallida={true}
        sms={{
          disponible: false,
          mensaje: "Necesito ayuda. Sin ubicación disponible.",
          longitudMensaje: 43,
          tieneUbicacion: false,
          puedeAbrir: false,
          puedeCopiar: true,
          aviso: "El SMS no está disponible en este dispositivo.",
          avisoCopia: "Mensaje copiado.",
          abrirRedactor: async () => false,
          copiarMensaje,
        }}
      />,
    );

    expect(screen.getByText("El SMS no está disponible en este dispositivo.")).toBeOnTheScreen();
    expect(screen.getByText("Mensaje copiado.")).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText("Copiar mensaje de alerta"));
    expect(copiarMensaje).toHaveBeenCalledTimes(1);
  });
});
