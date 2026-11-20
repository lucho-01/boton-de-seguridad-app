/**
 * Evidencia: cada gesto ejecuta sus callbacks en el hilo de JS (`runOnJS: true`).
 *
 * `useLongPressGesture` y `usePanGesture` disparan callbacks (`onBegin`,
 * `onFinalize`, `onUpdate`, `onDeactivate`). Si `runOnJS` no es `true`, esos
 * callbacks se ejecutan en el hilo de UI y llamar a funciones JavaScript
 * normales (como `onIniciar` o `cancelar`) lanza
 * «Tried to synchronously call a Remote Function» y cierra la app.
 *
 * Esta prueba lee el código fuente porque bajo Jest los módulos nativos están
 * sustituidos por stubs y no reproducen el fallo del dispositivo.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = process.cwd();
const CARPETAS = [join(RAIZ, "src", "components"), join(RAIZ, "src", "sensors"), join(RAIZ, "app")];

/** Devuelve el texto desde la llave de apertura hasta su cierre equilibrado. */
function extraerLlaves(fuente: string, inicio: number): string {
  let profundidad = 0;
  for (let i = inicio; i < fuente.length; i += 1) {
    if (fuente[i] === "{") {
      profundidad += 1;
    }
    if (fuente[i] === "}") {
      profundidad -= 1;
      if (profundidad === 0) {
        return fuente.slice(inicio, i + 1);
      }
    }
  }
  return fuente.slice(inicio);
}

/** Cuerpos de configuración de todos los gestos del archivo. */
function cuerposGestos(fuente: string): string[] {
  const cuerpos: string[] = [];
  const marcas = ["useLongPressGesture(", "usePanGesture("];
  for (const marca of marcas) {
    let indice = fuente.indexOf(marca);
    while (indice !== -1) {
      // El objeto de configuración empieza en el paréntesis de apertura.
      const inicioObjeto = fuente.indexOf("{", indice);
      if (inicioObjeto !== -1) {
        cuerpos.push(extraerLlaves(fuente, inicioObjeto));
      }
      indice = fuente.indexOf(marca, indice + marca.length);
    }
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

describe("gestos · cada gesto usa runOnJS: true", () => {
  it("encuentra archivos que declaran gestos", () => {
    const conGestos = archivos.filter((ruta) => {
      const fuente = readFileSync(ruta, "utf8");
      return fuente.includes("useLongPressGesture(") || fuente.includes("usePanGesture(");
    });

    expect(conGestos.length).toBeGreaterThan(0);
  });

  it.each(archivos)("%s declara runOnJS: true en cada gesto", (ruta) => {
    const fuente = readFileSync(ruta, "utf8");
    const cuerpos = cuerposGestos(fuente);
    const sinRunOnJs: string[] = [];

    for (const cuerpo of cuerpos) {
      if (!cuerpo.includes("runOnJS: true")) {
        sinRunOnJs.push(cuerpo.slice(0, 80));
      }
    }

    expect({ archivo: relative(RAIZ, ruta), sinRunOnJs }).toEqual({
      archivo: relative(RAIZ, ruta),
      sinRunOnJs: [],
    });
  });
});
