/**
 * Spec M0 · R1, R2 y R3 (`src/api/config.ts`).
 *
 * `resolverApiUrl` es pura: cubre la normalización de la barra final (R1), la
 * URL ausente (R2) y el rechazo de `http://`, `localhost` y `127.0.0.1` fuera
 * de desarrollo (R3). `obtenerApiUrl` lee `process.env` al cargar el módulo, así
 * que se prueba con `jest.isolateModules` y la variable se restaura después.
 */

import { obtenerApiUrl, resolverApiUrl, type ResultadoUrl } from "../config";

const VARIABLE_URL = "EXPO_PUBLIC_API_URL";

/**
 * Fija la variable de entorno dentro del caso y la restaura al terminar.
 *
 * `config.ts` la lee en cada llamada, así que basta asignarla justo antes.
 */
function conVariable(valor: string | undefined, ejecutar: () => void): void {
  const anterior = process.env[VARIABLE_URL];
  process.env[VARIABLE_URL] = valor;
  try {
    ejecutar();
  } finally {
    restaurarVariable(anterior);
  }
}

/** Deja la variable como estaba: un `undefined` se borra, no se asigna. */
function restaurarVariable(anterior: string | undefined): void {
  if (anterior !== undefined) {
    process.env[VARIABLE_URL] = anterior;
    return;
  }
  delete process.env[VARIABLE_URL];
}

function esperarUrl(resultado: ResultadoUrl): string {
  if (!resultado.ok) {
    throw new Error(`se esperaba una URL válida y llegó el motivo "${resultado.motivo}"`);
  }
  return resultado.url;
}

function esperarMotivo(resultado: ResultadoUrl): string {
  if (resultado.ok) {
    throw new Error(`se esperaba un motivo de error y llegó la URL "${resultado.url}"`);
  }
  return resultado.motivo;
}

describe("config · R1 normalización de la URL", () => {
  it("quita una barra final", () => {
    expect(esperarUrl(resolver("https://api.ejemplo.com/", false))).toBe("https://api.ejemplo.com");
  });

  it("quita varias barras finales", () => {
    expect(esperarUrl(resolver("https://api.ejemplo.com///", false))).toBe(
      "https://api.ejemplo.com",
    );
  });

  it("quita los espacios alrededor del valor", () => {
    expect(esperarUrl(resolver("  https://api.ejemplo.com  ", false))).toBe(
      "https://api.ejemplo.com",
    );
  });

  it("deja intactas las barras internas de una ruta", () => {
    expect(esperarUrl(resolver("https://api.ejemplo.com/v1/", false))).toBe(
      "https://api.ejemplo.com/v1",
    );
  });
});

describe("config · R2 URL ausente", () => {
  it("undefined → faltante", () => {
    expect(esperarMotivo(resolver(undefined, false))).toBe("faltante");
  });

  it("cadena vacía y solo espacios → faltante", () => {
    expect(esperarMotivo(resolver("", true))).toBe("faltante");
    expect(esperarMotivo(resolver("   ", false))).toBe("faltante");
  });

  it("solo barras y espacios → faltante", () => {
    expect(esperarMotivo(resolver(" // ", false))).toBe("faltante");
  });

  it("obtenerApiUrl con variable vacía también pide configurarla", () => {
    conVariable("", () => {
      expect(() => obtenerApiUrl(false)).toThrow("Falta configurar el servidor.");
    });
  });

  it("obtenerApiUrl devuelve la URL normalizada sin barra final", () => {
    conVariable("https://api.ejemplo.com/", () => {
      expect(obtenerApiUrl(false)).toBe("https://api.ejemplo.com");
    });
  });
});

describe("config · R3 fuera de desarrollo exige HTTPS y host público", () => {
  it("rechaza http://", () => {
    expect(esperarMotivo(resolver("http://api.ejemplo.com", false))).toBe("insegura");
  });

  it("rechaza localhost, aunque sea https", () => {
    expect(esperarMotivo(resolver("http://localhost:3000", false))).toBe("insegura");
    expect(esperarMotivo(resolver("https://localhost:3000", false))).toBe("insegura");
    expect(esperarMotivo(resolver("https://api.localhost", false))).toBe("insegura");
  });

  it("rechaza 127.0.0.1, aunque sea https", () => {
    expect(esperarMotivo(resolver("http://127.0.0.1:3000", false))).toBe("insegura");
    expect(esperarMotivo(resolver("https://127.0.0.1:8080", false))).toBe("insegura");
  });

  it("rechaza esquemas que no son HTTP(S)", () => {
    expect(esperarMotivo(resolver("ftp://api.ejemplo.com", false))).toBe("insegura");
    expect(esperarMotivo(resolver("api.ejemplo.com", false))).toBe("insegura");
  });

  it("acepta https con host público", () => {
    expect(esperarUrl(resolver("https://api.ejemplo.com", false))).toBe("https://api.ejemplo.com");
  });

  it("obtenerApiUrl lanza error de configuración con una URL insegura", () => {
    conVariable("http://api.ejemplo.com", () => {
      expect(() => obtenerApiUrl(false)).toThrow("La dirección del servidor no es segura.");
    });
  });
});

describe("config · R3 en desarrollo se acepta la API local", () => {
  it("acepta http://localhost", () => {
    expect(esperarUrl(resolver("http://localhost:3000", true))).toBe("http://localhost:3000");
  });

  it("acepta http://127.0.0.1 y http:// sin host local", () => {
    expect(esperarUrl(resolver("http://127.0.0.1:8081/", true))).toBe("http://127.0.0.1:8081");
    expect(esperarUrl(resolver("http://api.ejemplo.com", true))).toBe("http://api.ejemplo.com");
  });

  it("sigue exigiendo que la URL no esté vacía", () => {
    expect(esperarMotivo(resolver("  ", true))).toBe("faltante");
  });
});

/** Atajo de `resolverApiUrl`, que es pura y no depende del entorno. */
function resolver(valor: string | undefined, esDesarrollo: boolean): ResultadoUrl {
  return resolverApiUrl(valor, esDesarrollo);
}
