import { act, renderHook } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";

import { useClipboard } from "@/sensors/useClipboard";

describe("useClipboard · M11", () => {
  beforeEach(() => {
    jest.mocked(Clipboard.setStringAsync).mockClear();
  });

  it("copia el texto y devuelve el resultado del sistema", async () => {
    const vista = await renderHook(() => useClipboard());
    let copiado = false;
    await act(async () => {
      copiado = await vista.result.current.copiar("Mensaje de alerta");
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("Mensaje de alerta");
    expect(copiado).toBe(true);
  });

  it("no intenta copiar texto vacío", async () => {
    const vista = await renderHook(() => useClipboard());
    let copiado = true;
    await act(async () => {
      copiado = await vista.result.current.copiar("");
    });

    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(copiado).toBe(false);
  });

  it("devuelve false si falla la API del portapapeles", async () => {
    jest.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error("fallo"));
    const vista = await renderHook(() => useClipboard());
    let copiado = true;
    await act(async () => {
      copiado = await vista.result.current.copiar("Mensaje de alerta");
    });

    expect(copiado).toBe(false);
  });
});
