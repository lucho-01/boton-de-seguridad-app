import { guardarTokens, type TipoFetchCache } from "@/api";
import { borrarAlertaApi, guardarContactoApi, obtenerContactos, type ContactoApi } from "@/api";

const VARIABLE_URL = "EXPO_PUBLIC_API_URL";
const URL_API = "https://api.ejemplo.test";

const CONTACTO: ContactoApi = {
  id: "contacto-1",
  nombre: "Ana",
  telefono: "3001112233",
  parentesco: "Madre",
  principal: 1,
  created_at: "2026-11-20T20:00:00.000Z",
  updated_at: "2026-11-20T20:00:00.000Z",
  deleted_at: null,
};

interface Llamada {
  url: string;
  inicio: RequestInit;
}

function respuesta(cuerpo: object, status: number = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API de sincronización · M14", () => {
  let llamadas: Llamada[];
  let fetchImpl: TipoFetchCache;

  beforeEach(async () => {
    process.env[VARIABLE_URL] = URL_API;
    llamadas = [];
    fetchImpl = async (url, inicio) => {
      llamadas.push({ url, inicio });
      return respuesta({
        ...CONTACTO,
        ok: true,
        items: [CONTACTO],
        servidor_ahora: CONTACTO.updated_at,
      });
    };
    await guardarTokens({ token: "token-prueba", refresh_token: "refresh-prueba" });
  });

  afterEach(() => {
    delete process.env[VARIABLE_URL];
  });

  it("consulta contactos con cursor y Bearer; valida principal", async () => {
    const pagina = await obtenerContactos(CONTACTO.updated_at, fetchImpl);

    expect(pagina.items).toEqual([CONTACTO]);
    expect(llamadas[0].url).toBe(
      `${URL_API}/api/contactos?since=${encodeURIComponent(CONTACTO.updated_at)}`,
    );
    expect(llamadas[0].inicio.method).toBe("GET");
    expect(llamadas[0].inicio.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer token-prueba" }),
    );
  });

  it("incluye after_id para continuar páginas con el mismo updated_at", async () => {
    await obtenerContactos(CONTACTO.updated_at, fetchImpl, "contacto-0");

    expect(llamadas[0].url).toBe(
      `${URL_API}/api/contactos?since=${encodeURIComponent(CONTACTO.updated_at)}&after_id=contacto-0`,
    );
  });

  it("envía el contacto por PUT con principal en snake_case", async () => {
    await guardarContactoApi(CONTACTO, fetchImpl);

    expect(llamadas[0].url).toBe(`${URL_API}/api/contactos/contacto-1`);
    expect(llamadas[0].inicio.method).toBe("PUT");
    expect(llamadas[0].inicio.body).toBe(JSON.stringify(CONTACTO));
  });

  it("valida la respuesta y rechaza principal fuera del contrato", async () => {
    const fetchInvalido: TipoFetchCache = async () => respuesta({ ...CONTACTO, principal: 2 });

    await expect(obtenerContactos(CONTACTO.updated_at, fetchInvalido)).rejects.toThrow(
      "Respuesta del servidor no válida.",
    );
  });

  it("acepta el OK del borrado lógico de alertas", async () => {
    fetchImpl = async (url, inicio) => {
      llamadas.push({ url, inicio });
      return respuesta({ ok: true });
    };

    await expect(borrarAlertaApi("alerta-1", fetchImpl)).resolves.toBeUndefined();
    expect(llamadas[0].url).toBe(`${URL_API}/api/alertas/alerta-1`);
    expect(llamadas[0].inicio.method).toBe("DELETE");
  });
});
