/**
 * Regresión del contrato entre repositorios (spec M0 · R10 y §6, `docs/api-contrato.md`).
 *
 * Además de los tipos y esquemas, esta evidencia vigila que la app no gane
 * credenciales ni permisos que no le corresponden: es parte de las
 * restricciones de la IA y debe seguir en verde.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import type { Sesion } from "@/models";
import { RespuestaAuthSchema } from "@/api/contracts";

const RAIZ = process.cwd();

/** Carpetas que entran en la revisión de credenciales (R10). */
const CARPETAS_REVISADAS = ["app", "src"];
const ARCHIVOS_REVISADOS = ["app.json", "package.json"];

/** Extensiones con código o configuración que puede filtrar una clave. */
const EXTENSIONES = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]);

/** Rutas descartadas del recorrido: dependencias, salidas y pruebas. */
const RUTAS_IGNORADAS = ["node_modules", ".expo", "dist", "coverage", ".git", "__tests__"];

/**
 * Patrones de credencial armados por trozos para que esta prueba no se
 * delate a sí misma al leer el árbol de archivos.
 */
const PATRONES_PROHIBIDOS: ReadonlyArray<{ nombre: string; patron: RegExp }> = [
  { nombre: "firebaseConfig", patron: new RegExp("firebase" + "Config") },
  { nombre: "FIREBASE_", patron: new RegExp("FIRE" + "BASE_") },
  { nombre: "apiKey", patron: new RegExp("api" + "Key\\s*:") },
  { nombre: "service_account", patron: new RegExp("service_" + "account") },
];

/** Archivos que componen la app, ya leídos desde la raíz del repositorio. */
interface ArchivoRevisado {
  ruta: string;
  contenido: string;
}

function listarArchivos(directorio: string, acumulado: string[]): string[] {
  if (!existsSync(directorio)) {
    return acumulado;
  }
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    const esCarpeta = statSync(ruta).isDirectory();
    if (esCarpeta) {
      listarArchivos(ruta, acumulado);
      continue;
    }
    const extension = ruta.slice(ruta.lastIndexOf("."));
    if (EXTENSIONES.has(extension)) {
      acumulado.push(ruta);
    }
  }
  return acumulado;
}

function estaIgnorada(ruta: string): boolean {
  return RUTAS_IGNORADAS.some((ignorada) => ruta === ignorada || ruta.startsWith(`${ignorada}/`));
}

function leerRevisados(): ArchivoRevisado[] {
  const raices = CARPETAS_REVISADAS.map((carpeta) => join(RAIZ, carpeta));
  const archivos = raices.flatMap((raiz) => listarArchivos(raiz, []));
  for (const nombre of ARCHIVOS_REVISADOS) {
    archivos.push(join(RAIZ, nombre));
  }
  return archivos
    .map((ruta) => {
      const relativa = relative(RAIZ, ruta).split("\\").join("/");
      return { ruta: relativa, contenido: readFileSync(ruta, "utf8") };
    })
    .filter((archivo) => !estaIgnorada(archivo.ruta));
}

describe("contrato · tipos Sesion (`src/models/index.ts`)", () => {
  const fuente = readFileSync(join(RAIZ, "src", "models", "index.ts"), "utf8");

  it("declara Sesion con token, refresh_token, expira_en_seg y usuario", () => {
    for (const campo of ["token", "refresh_token", "expira_en_seg", "usuario"]) {
      expect(fuente).toMatch(new RegExp(`\\b${campo}\\s*:`));
    }
    expect(fuente).toMatch(/interface\s+Sesion\s*\{/);
  });

  it("el tipo Sesion compila con la forma del contrato", () => {
    const sesion: Sesion = {
      token: "t",
      refresh_token: "r",
      expira_en_seg: 3600,
      usuario: { id: "u1", email: "persona@ejemplo.com" },
    };
    expect(Object.keys(sesion).sort()).toEqual(
      ["expira_en_seg", "refresh_token", "token", "usuario"].sort(),
    );
  });

  it("declara EstadoAlerta con los dos estados del contrato", () => {
    expect(fuente).toMatch(/"cancelada"\s*\|\s*"mensaje_preparado"/);
  });
});

describe("contrato · esquemas Zod (`src/api/contracts`)", () => {
  it("aprueba una respuesta de auth completa", () => {
    const lectura = RespuestaAuthSchema.safeParse({
      token: "t",
      refreshToken: "r",
      expiraEnSeg: 3600,
      usuario: { id: "u1", email: "persona@ejemplo.com" },
    });
    expect(lectura.success).toBe(true);
  });

  it("rechaza un cuerpo sin token", () => {
    const lectura = RespuestaAuthSchema.safeParse({ refreshToken: "r", expiraEnSeg: 3600 });
    expect(lectura.success).toBe(false);
  });

  it("rechaza un refresh token vacío y una expiración inválida", () => {
    expect(
      RespuestaAuthSchema.safeParse({ token: "t", refreshToken: "", expiraEnSeg: 3600 }).success,
    ).toBe(false);
    expect(
      RespuestaAuthSchema.safeParse({ token: "t", refreshToken: "r", expiraEnSeg: -1 }).success,
    ).toBe(false);
  });

  it("la respuesta de auth usa camelCase en el cable, no snake_case", () => {
    const lectura = RespuestaAuthSchema.safeParse({
      token: "t",
      refresh_token: "r",
      expira_en_seg: 3600,
    });
    expect(lectura.success).toBe(false);
  });
});

describe("contrato · R10 ninguna credencial en la app", () => {
  const revisados = leerRevisados();

  it("revisa app/, src/ y los archivos de configuración", () => {
    const rutas = revisados.map((archivo) => archivo.ruta);
    expect(rutas).toContain("app.json");
    expect(rutas.some((ruta) => ruta.startsWith("src/api/"))).toBe(true);
    expect(rutas.some((ruta) => ruta.startsWith("app/"))).toBe(true);
  });

  it("no contiene firebaseConfig, credenciales de Firebase ni claves de servicio", () => {
    const infractores: string[] = [];
    for (const archivo of revisados) {
      for (const { nombre, patron } of PATRONES_PROHIBIDOS) {
        if (patron.test(archivo.contenido)) {
          infractores.push(`${archivo.ruta} contiene ${nombre}`);
        }
      }
    }
    expect(infractores).toEqual([]);
  });

  it(".env.example declara solo EXPO_PUBLIC_API_URL", () => {
    const lineas = readFileSync(join(RAIZ, ".env.example"), "utf8")
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0 && !linea.startsWith("#"));
    expect(lineas).toHaveLength(1);
    expect(lineas[0].startsWith("EXPO_PUBLIC_API_URL=")).toBe(true);
  });

  it("el código solo lee EXPO_PUBLIC_API_URL como variable pública", () => {
    const publicas = new Set<string>();
    for (const archivo of revisados) {
      for (const coincidencia of archivo.contenido.matchAll(/EXPO_PUBLIC_[A-Z0-9_]+/g)) {
        publicas.add(coincidencia[0]);
      }
    }
    expect([...publicas]).toEqual(["EXPO_PUBLIC_API_URL"]);
  });
});

describe("contrato · R10 app.json sin permisos de SMS", () => {
  const appJson = readFileSync(join(RAIZ, "app.json"), "utf8");

  it("no declara el permiso de envío de SMS en Android", () => {
    expect(appJson).not.toContain("SEND_SMS");
    expect(appJson).not.toContain("android.permission");
  });

  it("declara el permiso de ubicación solo con su texto", () => {
    expect(appJson).toContain("expo-location");
    expect(appJson).toContain("locationWhenInUsePermission");
    expect(appJson).not.toContain("locationAlwaysAndWhenInUsePermission");
  });
});
