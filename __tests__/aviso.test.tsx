/**
 * Spec M0 · R7 y §8.1 (aviso permanente de la línea 123).
 *
 * El texto es literal: se compara contra la constante exportada y contra la
 * cadena escrita en la spec. `PantallaConAviso` tiene que incluirlo siempre.
 */

import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AvisoLinea123, TEXTO_AVISO_123 } from "@/components/AvisoLinea123";
import { PantallaConAviso } from "@/components/PantallaConAviso";

const TEXTO_DE_LA_SPEC = "Este proyecto es educativo y no reemplaza la línea de emergencias 123.";

describe("AvisoLinea123 · R7", () => {
  it("el texto es exactamente el de la spec", () => {
    expect(TEXTO_AVISO_123).toBe(TEXTO_DE_LA_SPEC);
  });

  it("renderiza el aviso con role text y su etiqueta accesible", async () => {
    await render(<AvisoLinea123 />);

    const aviso = screen.getByText(TEXTO_AVISO_123);
    expect(aviso).toBeOnTheScreen();
    expect(aviso).toHaveProp("accessibilityRole", "text");
    expect(screen.getByLabelText(TEXTO_AVISO_123)).toBeOnTheScreen();
    expect(screen.getByRole("text", { name: TEXTO_AVISO_123 })).toBeOnTheScreen();
  });

  it("no es un encabezado ni un botón: es texto informativo", async () => {
    await render(<AvisoLinea123 />);

    expect(screen.queryByRole("header")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("PantallaConAviso · R7", () => {
  it("incluye el aviso con su contenido", async () => {
    await render(
      <PantallaConAviso>
        <Text>Contenido de prueba</Text>
      </PantallaConAviso>,
    );

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
    expect(screen.getByText("Contenido de prueba")).toBeOnTheScreen();
  });

  it("con barra de pestañas el aviso sigue presente", async () => {
    await render(
      <PantallaConAviso conBarraDePestanas>
        <Text>Contenido con pestañas</Text>
      </PantallaConAviso>,
    );

    expect(screen.getByText(TEXTO_AVISO_123)).toBeOnTheScreen();
  });
});
