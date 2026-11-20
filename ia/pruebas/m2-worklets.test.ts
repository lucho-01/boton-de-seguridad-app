/**
 * Evidencia: ningún worklet llama a una función normal de JavaScript.
 *
 * Reanimated 4 ejecuta `useAnimatedStyle` (y los gestos) en el hilo de UI. Si
 * dentro de ese callback se llama a una función declarada en el mismo archivo,
 * en el dispositivo aparece «Tried to synchronously call a Remote Function» y
 * la pantalla se cae. Bajo Jest el módulo está sustituido por un stub, así que
 * las pruebas de render no lo detectan; esta prueba lee el código fuente.
 *
 * Regla: dentro del cuerpo de `useAnimatedStyle(...)` solo se admiten
 * funciones globales (`Math.*`, `withTiming`, etc.), nunca ayudantes locales.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = process.cwd();
const CARPETAS = [join(RAIZ, "src", "components"), join(RAIZ, "src", "sensors"), join(RAIZ, "app")];

/** Devuelve el texto desde el paréntesis inicial hasta su cierre equilibrado. */
function extraerParentesis(fuente: string, inicio: number): string {
  let profundidad = 0;
  for (let i = inicio; i < fuente.length; i += 1) {
    if (fuente[i] === "(") {
      profundidad += 1;
    }
    if (fuente[i] === ")") {
      profundidad -= 1;
      if (profundidad === 0) {
        return fuente.slice(inicio, i + 1);
      }
    }
  }
  return fuente.slice(inicio);
}

/** Nombres de funciones y de constantes-flecha declaradas en el archivo. */
function funcionesLocales(fuente: string): string[] {
  const nombres: string[] = [];
  const patron =
    /(?:^|\n)\s*(?:export\s+)?(?:function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\()/g;
  let coincidencia = patron.exec(fuente);
  while (coincidencia !== null) {
    const nombre = coincidencia[1] ?? coincidencia[2];
    if (nombre !== undefined) {
      nombres.push(nombre);
    }
    coincidencia = patron.exec(fuente);
  }
  return nombres;
}

/** Cuerpos de todos los `useAnimatedStyle(...)` del archivo. */
function cuerposAnimados(fuente: string): string[] {
  const cuerpos: string[] = [];
  const marca = "useAnimatedStyle(";
  let indice = fuente.indexOf(marca);
  while (indice !== -1) {
    cuerpos.push(extraerParentesis(fuente, indice + marca.length - 1));
    indice = fuente.indexOf(marca, indice + marca.length);
  }
  return cuerpos;
}

function archivosDe(carpeta: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...archivosDe(ruta));
      continue;
    }
    if (entrada.name.endsWith(".ts") || entrada.name.endsWith(".tsx")) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

const archivos = CARPETAS.flatMap((carpeta) => archivosDe(carpeta));

describe("worklets · no llaman a funciones locales", () => {
  it("encuentra componentes con estilos animados", () => {
    const conAnimacion = archivos.filter((ruta) =>
      readFileSync(ruta, "utf8").includes("useAnimatedStyle("),
    );

    expect(conAnimacion.length).toBeGreaterThan(0);
  });

  it.each(archivos)("%s usa solo funciones globales dentro del worklet", (ruta) => {
    const fuente = readFileSync(ruta, "utf8");
    const locales = funcionesLocales(fuente);
    const llamadasProhibidas: string[] = [];

    for (const cuerpo of cuerposAnimados(fuente)) {
      for (const nombre of locales) {
        if (cuerpo.includes(`${nombre}(`)) {
          llamadasProhibidas.push(nombre);
        }
      }
    }

    expect({ archivo: relative(RAIZ, ruta), llamadasProhibidas }).toEqual({
      archivo: relative(RAIZ, ruta),
      llamadasProhibidas: [],
    });
  });
});
