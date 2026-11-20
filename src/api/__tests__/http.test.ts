/**
 * Spec M0 · R5, R6 y §7 (`src/api/http.ts`).
 *
 * `fetch` se inyecta con `OpcionesPeticion.fetchImpl` y cada intento recibe su
 * propio `Response` real, así el cliente recorre la misma ruta que en el
 * dispositivo. La URL se fija en `process.env` antes de cada caso (config la
 * lee por llamada) y se restaura siempre. Tiempo: no se espera ningún
 * `setTimeout`; el timeout se prueba con un `fetch` que lanza `AbortError`.
 */

import { z } from "zod";

import { resolverApiUrl } from "../config";
import { ApiError } from "../errors";
import { MS_TIEMPO_LIMITE, peticion, type TipoFetchCache } from "../http";
import { borrarTokens, guardarTokens, leerTokens } from "../tokenStore";

const TOKENS = { token: "token-viejo", refresh_token: "refresh-viejo" };
const TOKENS_NUEVOS = { token: "token-nuevo", refresh_token: "refresh-nuevo" };

const VARIABLE_URL = "EXPO_PUBLIC_API_URL";
const URL_DE_PRUEBA = "https://api.prueba.test/";

const CuerpoSchema = z.object({ valor: z.string() });

const USUARIO = { id: "usuario-1", email: "persona@ejemplo.com" };

/** Llamada registrada por el `fetch` simulado. */
interface Llamada {
  url: string;
  inicio: RequestInit;
}

/** Cabeceras de una llamada, ya normalizadas a objeto plano. */
function cabecerasDe(llamada: Llamada): Record<string, string> {
  const crudas = llamada.inicio.headers;
  const mapa: Record<string, string> = {};
  if (crudas === undefined) {
    return mapa;
  }
  if (crudas instanceof Headers) {
    crudas.forEach((valor, nombre) => {
      mapa[nombre] = valor;
    });
    return mapa;
  }
  if (Array.isArray(crudas)) {
    for (const [nombre, valor] of crudas) {
      mapa[nombre] = valor;
    }
    return mapa;
  }
  return { ...crudas };
}

/** Respuesta JSON real con su código HTTP. */
function json(cuerpo: object, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authValida(
  status: number,
  token: string,
  refreshToken: string,
  usuario: object | null = null,
): Response {
  const cuerpo: Record<string, object | string | number> = {
    token,
    refreshToken,
    expiraEnSeg: 3600,
  };
  if (usuario !== null) {
    cuerpo["usuario"] = usuario;
  }
  return json(cuerpo, status);
}

/**
 * `fetch` simulado que responde con la cola de respuestas y registra cada
 * llamada. Si la petición se repitiera más allá de la cola, falla.
 */
function fetchConCola(respuestas: Array<() => Response>): {
  fetchImpl: TipoFetchCache;
  llamadas: Llamada[];
} {
  const llamadas: Llamada[] = [];
  const fetchImpl: TipoFetchCache = async (url, inicio) => {
    llamadas.push({ url, inicio });
    const siguiente = respuestas[llamadas.length - 1];
    if (siguiente === undefined) {
      throw new TypeError(`llamada inesperada a ${url}`);
    }
    return siguiente();
  };
  return { fetchImpl, llamadas };
}

function rutasDe(llamadas: Llamada[]): string[] {
  return llamadas.map((llamada) => new URL(llamada.url).pathname);
}

/** Atrapa el `ApiError`; falla si no se lanzó o si no es `ApiError`. */
async function capturar(promesa: Promise<object>): Promise<ApiError> {
  try {
    await promesa;
  } catch (fallo) {
    if (fallo instanceof ApiError) {
      return fallo;
    }
    throw fallo;
  }
  throw new Error("se esperaba un ApiError y la petición se resolvió");
}

/** Ejecuta con la variable fijada y la restaura después. */
function conVariable(valor: string, ejecutar: () => void): void {
  const anterior = process.env[VARIABLE_URL];
  process.env[VARIABLE_URL] = valor;
  try {
    ejecutar();
  } finally {
    if (anterior !== undefined) {
      process.env[VARIABLE_URL] = anterior;
    }
  }
}

/** Valor previo de la variable, para devolverlo al terminar el caso. */
let anteriorUrl: string | undefined = undefined;

beforeEach(() => {
  anteriorUrl = process.env[VARIABLE_URL];
  process.env[VARIABLE_URL] = URL_DE_PRUEBA;
});

afterEach(() => {
  if (anteriorUrl !== undefined) {
    process.env[VARIABLE_URL] = anteriorUrl;
    return;
  }
  delete process.env[VARIABLE_URL];
});

describe("peticion · respuesta válida", () => {
  it("200 válido devuelve el cuerpo parseado y validado", async () => {
    const { fetchImpl, llamadas } = fetchConCola([() => json({ valor: "ok" }, 200)]);
    const cuerpo = await peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema);
    expect(cuerpo).toEqual({ valor: "ok" });
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].url).toBe("https://api.prueba.test/api/health");
    expect(llamadas[0].inicio.method).toBe("GET");
  });

  it("serializa el cuerpo a JSON y añade Content-Type", async () => {
    const { fetchImpl, llamadas } = fetchConCola([() => json({ valor: "ok" }, 200)]);
    await peticion(
      "POST",
      "/api/auth/login",
      { fetchImpl, cuerpo: { email: "a@b.co" } },
      CuerpoSchema,
    );
    expect(llamadas[0].inicio.body).toBe(JSON.stringify({ email: "a@b.co" }));
    expect(cabecerasDe(llamadas[0])["Content-Type"]).toBe("application/json");
  });

  it("acepta una ruta relativa sin barra inicial", async () => {
    const { fetchImpl, llamadas } = fetchConCola([() => json({ valor: "ok" }, 200)]);
    await peticion("GET", "api/health", { fetchImpl }, CuerpoSchema);
    expect(llamadas[0].url).toBe("https://api.prueba.test/api/health");
  });

  it("publica el timeout de 10 s de la spec", () => {
    expect(MS_TIEMPO_LIMITE).toBe(10_000);
  });
});

describe("peticion · R5 un solo refresh y un solo reintento", () => {
  it("401 con tokens → 1 refresh, 1 reintento y el token nuevo en la cabecera", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl, llamadas } = fetchConCola([
      () => json({ error: "token vencido" }, 401),
      () => authValida(200, TOKENS_NUEVOS.token, TOKENS_NUEVOS.refresh_token, USUARIO),
      () => json({ valor: "privado" }, 200),
    ]);

    const cuerpo = await peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true);

    expect(cuerpo).toEqual({ valor: "privado" });
    expect(llamadas).toHaveLength(3);
    expect(rutasDe(llamadas)).toEqual(["/api/alertas", "/api/auth/refresh", "/api/alertas"]);
    expect(cabecerasDe(llamadas[0]).Authorization).toBe(`Bearer ${TOKENS.token}`);
    expect(cabecerasDe(llamadas[1]).Authorization).toBeUndefined();
    expect(cabecerasDe(llamadas[2]).Authorization).toBe(`Bearer ${TOKENS_NUEVOS.token}`);
    expect(await leerTokens()).toEqual(TOKENS_NUEVOS);
  });

  it("el refresh envía el refreshToken guardado", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl, llamadas } = fetchConCola([
      () => json({ error: "token vencido" }, 401),
      () => authValida(200, TOKENS_NUEVOS.token, TOKENS_NUEVOS.refresh_token, USUARIO),
      () => json({ valor: "privado" }, 200),
    ]);

    await peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true);

    expect(llamadas[1].inicio.method).toBe("POST");
    expect(llamadas[1].inicio.body).toBe(JSON.stringify({ refreshToken: TOKENS.refresh_token }));
  });

  it("si el reintento vuelve a dar 401 no hay un segundo refresh", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl, llamadas } = fetchConCola([
      () => json({ error: "token vencido" }, 401),
      () => authValida(200, TOKENS_NUEVOS.token, TOKENS_NUEVOS.refresh_token, USUARIO),
      () => json({ error: "sigue vencido" }, 401),
    ]);

    const error = await capturar(
      peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true),
    );

    expect(llamadas).toHaveLength(3);
    expect(rutasDe(llamadas)).toEqual(["/api/alertas", "/api/auth/refresh", "/api/alertas"]);
    expect(error.estado).toBe(401);
    expect(error.sesion_invalida).toBe(true);
  });

  it("401 en una ruta pública no intenta refrescar", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl, llamadas } = fetchConCola([() => json({ error: "no autorizado" }, 401)]);

    const error = await capturar(peticion("POST", "/api/auth/login", { fetchImpl }, CuerpoSchema));

    expect(llamadas).toHaveLength(1);
    expect(error.motivo).toBe("autorizacion");
  });
});

describe("peticion · R5 refresh fallido", () => {
  it("refresh con 401 → tokens borrados y ApiError de autorización", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl, llamadas } = fetchConCola([
      () => json({ error: "token vencido" }, 401),
      () => json({ error: "refresh inválido" }, 401),
    ]);

    const error = await capturar(
      peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true),
    );

    expect(llamadas).toHaveLength(2);
    expect(rutasDe(llamadas)).toEqual(["/api/alertas", "/api/auth/refresh"]);
    expect(await leerTokens()).toBeNull();
    expect(error.motivo).toBe("autorizacion");
    expect(error.estado).toBe(401);
    expect(error.sesion_invalida).toBe(true);
  });

  it("refresh con 500 → tokens borrados y ApiError de autorización", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl } = fetchConCola([
      () => json({ error: "token vencido" }, 401),
      () => json({ error: "Error interno" }, 500),
    ]);

    const error = await capturar(
      peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true),
    );

    expect(await leerTokens()).toBeNull();
    expect(error.sesion_invalida).toBe(true);
  });

  it("un fetch que lanza durante el refresh también cierra la sesión", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl } = fetchConCola([
      () => json({ error: "token vencido" }, 401),
      () => {
        throw new TypeError("network request failed");
      },
    ]);

    const error = await capturar(
      peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true),
    );

    expect(await leerTokens()).toBeNull();
    expect(error.motivo).toBe("autorizacion");
  });

  it("permitirRefresh: false desactiva el refresh aunque haya tokens", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl, llamadas } = fetchConCola([() => json({ error: "vencido" }, 401)]);

    const error = await capturar(
      peticion("GET", "/api/alertas", { fetchImpl, permitirRefresh: false }, CuerpoSchema, true),
    );

    expect(llamadas).toHaveLength(1);
    expect(error.motivo).toBe("autorizacion");
    expect(await leerTokens()).toEqual(TOKENS);
  });
});

describe("peticion · R6 respuesta que no valida", () => {
  it("falta un campo del esquema → validación con el texto de §7", async () => {
    const { fetchImpl } = fetchConCola([() => json({ otro: "campo" }, 200)]);

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(error.motivo).toBe("validacion");
    expect(error.message).toBe("Respuesta del servidor no válida.");
    expect(error.estado).toBe(200);
  });

  it("un 200 que no es JSON también es validación", async () => {
    const { fetchImpl } = fetchConCola([() => new Response("no es json", { status: 200 })]);

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(error.message).toBe("Respuesta del servidor no válida.");
  });

  it("un campo con tipo equivocado también es validación", async () => {
    const { fetchImpl } = fetchConCola([() => json({ valor: 42 }, 200)]);

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(error.motivo).toBe("validacion");
  });
});

describe("peticion · §7 errores del servidor", () => {
  it("429 → «Demasiados intentos; espera un momento.»", async () => {
    const { fetchImpl } = fetchConCola([() => json({ error: "too many requests" }, 429)]);

    const error = await capturar(peticion("POST", "/api/auth/login", { fetchImpl }, CuerpoSchema));

    expect(error.motivo).toBe("demasiados_intentos");
    expect(error.estado).toBe(429);
    expect(error.message).toBe("Demasiados intentos; espera un momento.");
  });

  it("500 → «Error del servidor. Inténtalo más tarde.»", async () => {
    const { fetchImpl } = fetchConCola([() => json({ error: "Error interno" }, 500)]);

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(error.motivo).toBe("servidor");
    expect(error.estado).toBe(500);
    expect(error.message).toBe("Error del servidor. Inténtalo más tarde.");
  });

  it("nunca filtra el cuerpo crudo de la respuesta en el mensaje", async () => {
    const { fetchImpl } = fetchConCola([() => json({ error: "detalle interno 123" }, 500)]);

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(error.message).not.toContain("detalle interno");
  });
});

describe("peticion · fallos sin respuesta", () => {
  it("fetch que lanza TypeError → red y «Sin conexión con el servidor.»", async () => {
    const { fetchImpl } = fetchConCola([
      () => {
        throw new TypeError("network request failed");
      },
    ]);

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(error.motivo).toBe("red");
    expect(error.estado).toBeNull();
    expect(error.message).toBe("Sin conexión con el servidor.");
  });

  it("AbortError (timeout de 10 s) → motivo de tiempo, sin esperar", async () => {
    const { fetchImpl } = fetchConCola([
      () => {
        const abortado = new Error("Aborted");
        abortado.name = "AbortError";
        throw abortado;
      },
    ]);

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(error.motivo).toBe("tiempo");
    expect(error.message).toBe("Sin conexión con el servidor.");
  });

  it("sin EXPO_PUBLIC_API_URL falla con configuración y el texto de R2", async () => {
    delete process.env[VARIABLE_URL];
    let llamadas = 0;
    const fetchImpl: TipoFetchCache = async () => {
      llamadas += 1;
      return json({ valor: "ok" }, 200);
    };

    const error = await capturar(peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema));

    expect(llamadas).toBe(0);
    expect(error.motivo).toBe("configuracion");
    expect(error.message).toBe("Falta configurar el servidor.");
  });

  it("con una URL insegura fuera de desarrollo falla con configuración", () => {
    conVariable("http://api.prueba.test", () => {
      const resultado = resolverApiUrl(process.env[VARIABLE_URL], false);
      expect(resultado).toEqual({ ok: false, motivo: "insegura" });
    });
  });

  it("en desarrollo una URL local se acepta", async () => {
    process.env[VARIABLE_URL] = "http://localhost:3000/";
    const { fetchImpl, llamadas } = fetchConCola([() => json({ valor: "ok" }, 200)]);

    const cuerpo = await peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema);

    expect(cuerpo).toEqual({ valor: "ok" });
    expect(llamadas[0].url).toBe("http://localhost:3000/api/health");
  });
});

describe("peticion · rutas autenticadas sin sesión", () => {
  it("sin tokens guardados no añade Authorization y no falla", async () => {
    const { fetchImpl, llamadas } = fetchConCola([() => json({ valor: "público" }, 200)]);

    const cuerpo = await peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true);

    expect(cuerpo).toEqual({ valor: "público" });
    expect(cabecerasDe(llamadas[0]).Authorization).toBeUndefined();
    expect(llamadas).toHaveLength(1);
  });

  it("sin tokens, un 401 en ruta autenticada no dispara refresh", async () => {
    const { fetchImpl, llamadas } = fetchConCola([() => json({ error: "no autorizado" }, 401)]);

    const error = await capturar(
      peticion("GET", "/api/alertas", { fetchImpl }, CuerpoSchema, true),
    );

    expect(llamadas).toHaveLength(1);
    expect(error.motivo).toBe("autorizacion");
  });

  it("una ruta pública no lleva Authorization aunque haya tokens", async () => {
    await guardarTokens(TOKENS);
    const { fetchImpl, llamadas } = fetchConCola([() => json({ valor: "ok" }, 200)]);

    await peticion("GET", "/api/health", { fetchImpl }, CuerpoSchema);

    expect(cabecerasDe(llamadas[0]).Authorization).toBeUndefined();
  });

  it("borrarTokens deja el almacén vacío entre casos", async () => {
    await guardarTokens(TOKENS);
    await borrarTokens();
    expect(await leerTokens()).toBeNull();
  });
});
