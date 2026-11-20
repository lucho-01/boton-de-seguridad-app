/**
 * Spec M4 · pruebas de render de pantallas de contactos.
 *
 * Se inyecta un controlador falso en cada pantalla, así que no se toca SQLite
 * ni la API. `expo-router` se simula para navegar sin efectos secundarios.
 */

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import PantallaContacto from "../app/contacto";
import PantallaContactos from "../app/(tabs)/contactos";
import {
  ETIQUETA_ELIMINAR,
  ETIQUETA_EDITAR,
  TEXTO_AGREGAR_CONTACTO,
  TEXTO_SIN_CONTACTOS,
} from "../app/(tabs)/contactos";
import {
  TEXTO_CANCELAR,
  TEXTO_GUARDAR,
  ETIQUETA_NOMBRE,
  ETIQUETA_TELEFONO,
  ETIQUETA_PARENTESCO,
} from "../app/contacto";
import {
  type ContactosController,
  type ResultadoGuardado,
} from "@/controllers/useContactosController";

const contactoEjemplo = {
  id: "c1",
  nombre: "Ana Gómez",
  telefono: "3001112233",
  parentesco: "Madre",
  remote_id: null,
  created_at: "2026-11-14T10:00:00.000Z",
  updated_at: "2026-11-14T10:00:00.000Z",
  deleted_at: null,
  pending: 1,
  deleted: 0,
  principal: 0,
};

function controladorFalso(sobreescritos: Partial<ContactosController> = {}): ContactosController {
  return {
    contactos: [],
    cargando: false,
    puedeAgregar: true,
    aviso: null,
    guardar: jest.fn(async (): Promise<ResultadoGuardado> => ({
      ok: true,
      mensaje: "Contacto guardado.",
    })),
    eliminar: jest.fn(async () => true),
    refrescar: jest.fn(async () => undefined),
    limpiarAviso: jest.fn(),
    obtenerContacto: jest.fn(() => null),
    obtenerPrincipal: jest.fn(() => null),
    marcarPrincipal: jest.fn(async () => undefined),
    togglePrincipal: jest.fn(async () => undefined),
    ...sobreescritos,
  };
}

const mockGuardar = (ctl: ContactosController) => jest.mocked(ctl.guardar);
const mockEliminar = (ctl: ContactosController) => jest.mocked(ctl.eliminar);
const mockObtenerContacto = (ctl: ContactosController) => jest.mocked(ctl.obtenerContacto);

/**
 * Las filas de contactos usan `GestureDetector`, que exige un
 * `GestureHandlerRootView` ancestro (RNGH v3). En la app lo pone el layout;
 * aquí se añade el mismo contenedor para que el render sea fiel.
 */
function renderConGestos(ui: ReactElement) {
  return render(<GestureHandlerRootView style={{ flex: 1 }}>{ui}</GestureHandlerRootView>);
}

/** Variables capturadas dentro del factory de jest.mock para expo-router. */
let mockPushVar: jest.Mock;
let mockBackVar: jest.Mock;

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: jest.fn(() => ({
    push: (mockPushVar = jest.fn()),
    back: (mockBackVar = jest.fn()),
    replace: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

describe("PantallaContactos", () => {
  beforeEach(() => {
    mockPushVar = jest.fn();
    mockBackVar = jest.fn();
  });

  it("muestra estado vacío y botón añadir", async () => {
    const ctl = controladorFalso();
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    expect(screen.getByText(TEXTO_SIN_CONTACTOS)).toBeOnTheScreen();
    const botonesAgregar = screen.getAllByText(TEXTO_AGREGAR_CONTACTO);
    expect(botonesAgregar).toHaveLength(2);
    expect(screen.getAllByLabelText("Añadir un contacto de confianza")).toHaveLength(2);
  });

  it("muestra lista de contactos con botones editar y eliminar", async () => {
    const ctl = controladorFalso({
      contactos: [contactoEjemplo],
    });
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    expect(screen.getByText("Ana Gómez")).toBeOnTheScreen();
    expect(screen.getByText("3001112233")).toBeOnTheScreen();
    expect(screen.getByLabelText(ETIQUETA_EDITAR)).toBeOnTheScreen();
    expect(screen.getByLabelText(ETIQUETA_ELIMINAR)).toBeOnTheScreen();
  });

  it("muestra aviso del controlador", async () => {
    const ctl = controladorFalso({ aviso: "Contacto guardado." });
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    expect(screen.getByText("Contacto guardado.")).toBeOnTheScreen();
  });

  it("navega al formulario al pulsar añadir", async () => {
    const ctl = controladorFalso();
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    const botonesAgregar = screen.getAllByLabelText("Añadir un contacto de confianza");
    await act(async () => {
      await fireEvent.press(botonesAgregar[0]);
    });

    expect(mockPushVar).toHaveBeenCalledWith("/contacto");
  });

  it("navega al formulario de edición al pulsar editar", async () => {
    const ctl = controladorFalso({ contactos: [contactoEjemplo] });
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    await act(async () => {
      await fireEvent.press(screen.getByLabelText(ETIQUETA_EDITAR));
    });

    expect(mockPushVar).toHaveBeenCalledWith("/contacto?id=c1");
  });

  it("pide confirmación antes de eliminar", async () => {
    const ctl = controladorFalso({ contactos: [contactoEjemplo] });
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    await act(async () => {
      await fireEvent.press(screen.getByLabelText(ETIQUETA_ELIMINAR));
    });

    expect(screen.getByText('¿Eliminar el contacto "Ana Gómez"?')).toBeOnTheScreen();
    expect(screen.getByLabelText("Cancelar eliminación")).toBeOnTheScreen();
    expect(screen.getByLabelText("Confirmar eliminación del contacto")).toBeOnTheScreen();
  });

  it("elimina el contacto al confirmar", async () => {
    const ctl = controladorFalso({ contactos: [contactoEjemplo] });
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    await act(async () => {
      await fireEvent.press(screen.getByLabelText(ETIQUETA_ELIMINAR));
    });
    await act(async () => {
      await fireEvent.press(screen.getByLabelText("Confirmar eliminación del contacto"));
    });

    expect(mockEliminar(ctl)).toHaveBeenCalledWith("c1");
  });

  it("no elimina al cancelar la confirmación", async () => {
    const ctl = controladorFalso({ contactos: [contactoEjemplo] });
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    await act(async () => {
      await fireEvent.press(screen.getByLabelText(ETIQUETA_ELIMINAR));
    });
    await act(async () => {
      await fireEvent.press(screen.getByLabelText("Cancelar eliminación"));
    });

    expect(mockEliminar(ctl)).not.toHaveBeenCalled();
  });

  it("deshabilita añadir cuando ya hay 5 contactos", async () => {
    const cinco = Array.from({ length: 5 }, (_, i) => ({
      ...contactoEjemplo,
      id: `c${i}`,
      nombre: `Contacto ${i}`,
      telefono: `300000000${i}`,
    }));
    const ctl = controladorFalso({ contactos: cinco, puedeAgregar: false });
    await renderConGestos(<PantallaContactos controlador={ctl} />);

    expect(screen.getByLabelText("Añadir un contacto de confianza")).toBeDisabled();
  });
});

describe("PantallaContacto", () => {
  beforeEach(() => {
    mockPushVar = jest.fn();
    mockBackVar = jest.fn();
  });

  it("muestra formulario de alta con campos vacíos", async () => {
    const ctl = controladorFalso();
    await renderConGestos(<PantallaContacto controlador={ctl} />);

    expect(screen.getByLabelText(ETIQUETA_NOMBRE)).toBeOnTheScreen();
    expect(screen.getByLabelText(ETIQUETA_TELEFONO)).toBeOnTheScreen();
    expect(screen.getByLabelText(ETIQUETA_PARENTESCO)).toBeOnTheScreen();
    expect(screen.getByText(TEXTO_GUARDAR)).toBeOnTheScreen();
    expect(screen.getByText(TEXTO_CANCELAR)).toBeOnTheScreen();
  });

  it("guarda un contacto válido y vuelve atrás", async () => {
    const ctl = controladorFalso();
    await renderConGestos(<PantallaContacto controlador={ctl} />);

    await act(async () => {
      await fireEvent.changeText(screen.getByLabelText(ETIQUETA_NOMBRE), "Juan");
    });
    await act(async () => {
      await fireEvent.changeText(screen.getByLabelText(ETIQUETA_TELEFONO), "3001234567");
    });
    await act(async () => {
      await fireEvent.press(screen.getByText(TEXTO_GUARDAR));
    });

    expect(mockGuardar(ctl)).toHaveBeenCalledWith(
      { nombre: "Juan", telefono: "3001234567", parentesco: "", principal: 0 },
      undefined,
    );
    expect(mockBackVar).toHaveBeenCalled();
  });

  it("muestra errores de validación sin guardar", async () => {
    const ctl = controladorFalso({
      guardar: jest.fn(async (): Promise<ResultadoGuardado> => ({
        ok: false,
        errores: [
          { campo: "nombre", mensaje: "Escribe el nombre del contacto." },
          { campo: "telefono", mensaje: "El teléfono debe tener 10 dígitos." },
        ],
      })),
    });
    await renderConGestos(<PantallaContacto controlador={ctl} />);

    await act(async () => {
      await fireEvent.press(screen.getByText(TEXTO_GUARDAR));
    });

    expect(mockGuardar(ctl)).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Escribe el nombre del contacto.")).toBeOnTheScreen();
    expect(screen.getByText("El teléfono debe tener 10 dígitos.")).toBeOnTheScreen();
  });

  it("carga contacto para edición", async () => {
    const ctl = controladorFalso({
      obtenerContacto: jest.fn(() => contactoEjemplo),
    });
    await renderConGestos(<PantallaContacto controlador={ctl} id="c1" />);

    expect(mockObtenerContacto(ctl)).toHaveBeenCalledWith("c1");
    expect(screen.getByLabelText(ETIQUETA_NOMBRE).props.value).toBe("Ana Gómez");
    expect(screen.getByLabelText(ETIQUETA_TELEFONO).props.value).toBe("3001112233");
    expect(screen.getByLabelText(ETIQUETA_PARENTESCO).props.value).toBe("Madre");
  });

  it("edita un contacto y guarda con su id", async () => {
    const ctl = controladorFalso({
      obtenerContacto: jest.fn(() => contactoEjemplo),
    });
    await renderConGestos(<PantallaContacto controlador={ctl} id="c1" />);

    await act(async () => {
      await fireEvent.changeText(screen.getByLabelText(ETIQUETA_NOMBRE), "Ana Editada");
    });
    await act(async () => {
      await fireEvent.press(screen.getByText(TEXTO_GUARDAR));
    });

    expect(mockGuardar(ctl)).toHaveBeenCalledWith(
      { nombre: "Ana Editada", telefono: "3001112233", parentesco: "Madre", principal: 0 },
      "c1",
    );
    expect(mockBackVar).toHaveBeenCalled();
  });

  it("volver atrás pulsa cancelar", async () => {
    const ctl = controladorFalso();
    await renderConGestos(<PantallaContacto controlador={ctl} />);

    await act(async () => {
      await fireEvent.press(screen.getByText(TEXTO_CANCELAR));
    });

    expect(mockBackVar).toHaveBeenCalled();
  });
});
