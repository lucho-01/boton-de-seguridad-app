/**
 * Spec M0 · R4, §7 y contrato §0–§1 (`src/api/auth.ts`).
 *
 * `fetch` se inyecta por parámetro; cada intento recibe su propio `Response`.
 * Los tokens se comprueban solo contra el almacén simulado: nunca se imprimen.
 */

import { ApiError } from "../errors";
import {
  cerrarSesion,
  comprobarHealth,
  iniciarSesion,
  obtenerUsuarioActual,
  registrarCuenta,
} from "../auth";
import { leerTokens } from "../tokenStore";
import type { TipoFetchCache } from "../http";

const USUARIO = { id: "usuario-1", email: "persona@ejemplo.com" };
const TOKENS = { token: "token-auth-1", refreshToken: "refresh-auth-2", expiraEnSeg: 3600 };

const VARIABLE_URL = "EXPO_PUBLIC_API_URL";
const URL_DE_PRUEBA = "https://api.prueba.test/";

interface Llamada {
  url: string;
  inicio: RequestInit;
}

function json(cuerpo: object, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

function rutaDe(llamada: Llamada): string {
  return new URL(llamada.url).pathname;
}

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

describe("comprobarHealth · R8", () => {
  it("200 con ok, servicio y versión devuelve el estado del servidor", async () => {
    const { fetchImpl, llamadas } = fetchConCola([
      () => json({ ok: true, servicio: "boton-de-seguridad-api", version: "1.2.3" }, 200),
    ]);

    const estado = await comprobarHealth(fetchImpl);

    expect(estado).toEqual({ ok: true, servicio: "boton-de-seguridad-api", version: "1.2.3" });
    expect(llamadas).toHaveLength(1);
    expect(rutaDe(llamadas[0])).toBe("/api/health");
    expect(llamadas[0].inicio.method).toBe("GET");
  });

  it("200 con ok distinto de true → ApiError de validación", async () => {
    const { fetchImpl } = fetchConCola([
      () => json({ ok: false, servicio: "x", version: "1" }, 200),
    ]);

    const error = await capturar(comprobarHealth(fetchImpl));

    expect(error.motivo).toBe("validacion");
    expect(error.message).toBe("Respuesta del servidor no válida.");
  });

  it("200 sin versión → ApiError de validación", async () => {
    const { fetchImpl } = fetchConCola([() => json({ ok: true, servicio: "x" }, 200)]);

    const error = await capturar(comprobarHealth(fetchImpl));

    expect(error.motivo).toBe("validacion");
  });

  it("sin red → ApiError de red con el texto de §7", async () => {
    const { fetchImpl } = fetchConCola([
      () => {
        throw new TypeError("network request failed");
      },
    ]);

    const error = await capturar(comprobarHealth(fetchImpl));

    expect(error.motivo).toBe("red");
    expect(error.message).toBe("Sin conexión con el servidor.");
  });
});

describe("iniciarSesion · contrato §1", () => {
  it("login con usuario devuelve la Sesion y guarda los tokens", async () => {
    const { fetchImpl, llamadas } = fetchConCola([
      () => json({ ...TOKENS, usuario: USUARIO }, 200),
    ]);

    const sesion = await iniciarSesion(
      { email: USUARIO.email, password: "secreto-123" },
      fetchImpl,
    );

    expect(sesion).toEqual({
      token: TOKENS.token,
      refresh_token: TOKENS.refreshToken,
      expira_en_seg: TOKENS.expiraEnSeg,
      usuario: USUARIO,
    });
    expect(await leerTokens()).toEqual({ token: TOKENS.token, refresh_token: TOKENS.refreshToken });
    expect(rutaDe(llamadas[0])).toBe("/api/auth/login");
    expect(llamadas[0].inicio.method).toBe("POST");
    expect(llamadas[0].inicio.body).toBe(
      JSON.stringify({ email: USUARIO.email, password: "secreto-123" }),
    );
    expect(llamadas).toHaveLength(1);
  });

  it("login sin usuario se completa con GET /api/auth/yo", async () => {
    const { fetchImpl, llamadas } = fetchConCola([
      () => json(TOKENS, 200),
      () => json({ usuario: USUARIO }, 200),
    ]);

    const sesion = await iniciarSesion(
      { email: USUARIO.email, password: "secreto-123" },
      fetchImpl,
    );

    expect(sesion.usuario).toEqual(USUARIO);
    expect(llamadas).toHaveLength(2);
    expect(rutaDe(llamadas[1])).toBe("/api/auth/yo");
  });

  it("401 de credenciales → ApiError de autorización sin guardar tokens", async () => {
    const { fetchImpl } = fetchConCola([() => json({ error: "Credenciales inválidas" }, 401)]);

    const error = await capturar(
      iniciarSesion({ email: USUARIO.email, password: "incorrecta" }, fetchImpl),
    );

    expect(error.motivo).toBe("autorizacion");
    expect(error.estado).toBe(401);
    expect(await leerTokens()).toBeNull();
  });

  it("429 de demasiados intentos usa el texto de §7", async () => {
    const { fetchImpl } = fetchConCola([() => json({ error: "too many" }, 429)]);

    const error = await capturar(
      iniciarSesion({ email: USUARIO.email, password: "secreto-123" }, fetchImpl),
    );

    expect(error.message).toBe("Demasiados intentos; espera un momento.");
  });
});

describe("registrarCuenta · contrato §1", () => {
  it("201 devuelve la Sesion y guarda los tokens", async () => {
    const { fetchImpl, llamadas } = fetchConCola([
      () => json({ ...TOKENS, usuario: USUARIO }, 201),
    ]);

    const sesion = await registrarCuenta(
      { email: USUARIO.email, password: "secreto-123" },
      fetchImpl,
    );

    expect(sesion.usuario).toEqual(USUARIO);
    expect(sesion.expira_en_seg).toBe(TOKENS.expiraEnSeg);
    expect(await leerTokens()).not.toBeNull();
    expect(rutaDe(llamadas[0])).toBe("/api/auth/registro");
  });

  it("409 por correo repetido → ApiError con estado 409", async () => {
    const { fetchImpl } = fetchConCola([
      () => json({ error: "El correo ya está registrado" }, 409),
    ]);

    const error = await capturar(
      registrarCuenta({ email: USUARIO.email, password: "secreto-123" }, fetchImpl),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.estado).toBe(409);
    expect(await leerTokens()).toBeNull();
  });

  it("400 con detalles de formulario los expone sin mostrar el cuerpo crudo", async () => {
    const { fetchImpl } = fetchConCola([
      () =>
        json(
          {
            error: "Datos inválidos",
            detalles: [{ campo: "password", mensaje: "Debe tener 8 caracteres" }],
          },
          400,
        ),
    ]);

    const error = await capturar(
      registrarCuenta({ email: USUARIO.email, password: "corta" }, fetchImpl),
    );

    expect(error.detalles).toEqual([{ campo: "password", mensaje: "Debe tener 8 caracteres" }]);
    expect(error.message).not.toContain("Debe tener 8");
  });
});

describe("obtenerUsuarioActual · R9", () => {
  it("con el token guardado devuelve el usuario de /api/auth/yo", async () => {
    const { fetchImpl } = fetchConCola([() => json({ ...TOKENS, usuario: USUARIO }, 200)]);
    await iniciarSesion({ email: USUARIO.email, password: "secreto-123" }, fetchImpl);

    const { fetchImpl: fetchYo, llamadas } = fetchConCola([() => json({ usuario: USUARIO }, 200)]);
    const usuario = await obtenerUsuarioActual(fetchYo);

    expect(usuario).toEqual(USUARIO);
    expect(rutaDe(llamadas[0])).toBe("/api/auth/yo");
  });

  it("sin tokens guardados la petición igual llega y el 401 es de autorización", async () => {
    const { fetchImpl } = fetchConCola([() => json({ error: "no autorizado" }, 401)]);

    const error = await capturar(obtenerUsuarioActual(fetchImpl));

    expect(error.motivo).toBe("autorizacion");
    expect(error.sesion_invalida).toBe(true);
  });
});

describe("cerrarSesion · R4", () => {
  it("borra los tokens guardados", async () => {
    const { fetchImpl } = fetchConCola([() => json({ ...TOKENS, usuario: USUARIO }, 200)]);
    await iniciarSesion({ email: USUARIO.email, password: "secreto-123" }, fetchImpl);
    expect(await leerTokens()).not.toBeNull();

    await cerrarSesion();

    expect(await leerTokens()).toBeNull();
  });
});
