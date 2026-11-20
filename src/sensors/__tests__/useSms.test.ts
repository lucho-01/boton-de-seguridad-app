import { act, renderHook } from "@testing-library/react-native";
import * as SMS from "expo-sms";

jest.mock("expo-sms", () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(async () => true),
  sendSMSAsync: jest.fn(async () => ({ result: "cancelled" })),
}));

import { useSms } from "@/sensors/useSms";

describe("useSms · M10", () => {
  it("abre el redactor con destinatarios y mensaje", async () => {
    const vista = await renderHook(() => useSms());
    await act(async () => {});

    let abierto = false;
    await act(async () => {
      abierto = await vista.result.current.abrirRedactor(["3001234567"], "Necesito ayuda");
    });

    expect(abierto).toBe(true);
    expect(SMS.sendSMSAsync).toHaveBeenCalledWith(["3001234567"], "Necesito ayuda");
  });

  it("absorbe un fallo al abrir el redactor", async () => {
    jest.mocked(SMS.sendSMSAsync).mockRejectedValueOnce(new Error("fallo"));
    const vista = await renderHook(() => useSms());
    await act(async () => {});

    let abierto = true;
    await act(async () => {
      abierto = await vista.result.current.abrirRedactor(["3001234567"], "Necesito ayuda");
    });

    expect(abierto).toBe(false);
  });
});
