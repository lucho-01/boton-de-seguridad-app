/**
 * Reglas de seguridad que aplica el guard de OpenCode antes de ejecutar una herramienta.
 *
 * Qué bloquea:
 *  - secretos: `.env*` (salvo `.env.example`), `secrets/`, `data/`, keystores, claves,
 *    `google-services.json`, `GoogleService-Info.plist`, `credentials.json` de EAS;
 *  - cualquier ruta fuera de la carpeta del proyecto (incluye `..`, absolutas y `~`);
 *  - comandos con efecto externo o destructivo (git push, eas build, expo publish, curl…);
 *  - volcados de variables de entorno (printenv, env, Get-ChildItem env:).
 *
 * Es defensa en profundidad, no un sandbox: los permisos de `opencode.json` son la primera capa.
 */
import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { z } from "zod";

/** Campo de texto opcional; si llega con otro tipo se ignora. */
const optionalText = z.string().optional().catch(undefined);

/** Argumentos que inspecciona el guard. */
export const ToolArgsSchema = z.looseObject({
  command: optionalText,
  filePath: optionalText,
  file_path: optionalText,
  path: optionalText,
  directory: optionalText,
  pattern: optionalText,
  include: optionalText,
  glob: optionalText,
  notebook_path: optionalText,
});
export type ToolArgs = z.infer<typeof ToolArgsSchema>;

/** Nombres de campo que sugieren una ruta o un patrón. */
const PATH_LIKE_KEY = /path|file|dir|glob|pattern|include|cwd/i;

/** Herramientas de shell (cada harness las llama distinto). */
const SHELL_TOOLS: readonly string[] = ["bash", "shell"];

/** Carpetas prohibidas, relativas a la raíz del proyecto. */
export const FORBIDDEN_DIRS = ["secrets/", "data/"] as const;

/** Archivos prohibidos por nombre base. */
export const FORBIDDEN_FILE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /\.(pem|key|p12|jks|keystore|mobileprovision)$/i,
  /^google-services\.json$/i,
  /^GoogleService-Info\.plist$/i,
  /^credentials\.json$/i,
  /^.*service[-_]?account.*\.json$/i,
  /^firebase-adminsdk.*\.json$/i,
  /\.(apk|aab|ipa)$/i,
] as const;

/** Excepciones: este archivo se puede leer (no contiene valores). */
export const ALLOWED_EXCEPTIONS = [".env.example"] as const;

/** Comandos con efecto fuera de la máquina o destructivos. */
export const DENIED_COMMANDS: readonly { pattern: RegExp; motivo: string }[] = [
  { pattern: /\bgit\s+push\b/i, motivo: "git push" },
  { pattern: /\bgit\s+remote\s+(add|set-url|remove)\b/i, motivo: "cambiar remotos de git" },
  { pattern: /\beas\s+(build|submit|update|whoami)\b/i, motivo: "CLI de EAS" },
  { pattern: /\bexpo\s+(publish|build|submit|update)\b/i, motivo: "publicación de Expo" },
  { pattern: /\bvercel\b/i, motivo: "CLI de Vercel" },
  { pattern: /\bfirebase\b/i, motivo: "CLI de Firebase" },
  { pattern: /\b(npm|pnpm|yarn)\s+publish\b/i, motivo: "publicar un paquete" },
  {
    pattern: /\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b/i,
    motivo: "descarga o petición externa",
  },
  { pattern: /\b(ssh|scp|sftp)\b/i, motivo: "conexión remota" },
  { pattern: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i, motivo: "borrado recursivo" },
  { pattern: /\bRemove-Item\b[^\n]*-Recurse\b/i, motivo: "borrado recursivo" },
  { pattern: /\bprintenv\b/i, motivo: "volcado de variables de entorno" },
  { pattern: /^\s*env\s*$/i, motivo: "volcado de variables de entorno" },
  {
    pattern: /(?:^|[;&|]\s*)env\s*(?:$|[;&|])/i,
    motivo: "volcado de variables de entorno",
  },
  {
    pattern: /\bGet-(ChildItem|Item|Content)\b[^\n]*\benv:/i,
    motivo: "volcado de variables de entorno",
  },
];

function realpathOrSelf(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

/** Resuelve una ruta contra la raíz del proyecto. */
function relativeToRoot(p: string, root: string): { rel: string; outside: boolean } | null {
  if (!p || p.includes("\0")) {
    return null;
  }
  const abs = resolve(root, p);
  let real = abs;
  try {
    if (existsSync(abs)) {
      real = realpathSync(abs);
    }
  } catch {
    // Sin acceso: se usa la ruta lógica.
  }
  const rel = relative(realpathOrSelf(root), real);
  if (!rel) {
    return { rel: "", outside: false };
  }
  const normalized = rel.split(sep).join("/");
  const outside = normalized.startsWith("..") || isAbsolute(rel);
  return { rel: normalized, outside };
}

/** Repo hermano autorizado por la persona el 2026-11-14 para construir la API (A0). */
export const REPO_HERMANO = "boton-de-seguridad-api";

/** ¿La ruta cae dentro del repo hermano autorizado? (se compara la ruta ya resuelta) */
export function enRepoHermano(p: string, root: string): boolean {
  const hermano = resolve(realpathOrSelf(root), "..", REPO_HERMANO);
  const abs = resolve(root, p);
  const rel = relative(hermano, abs);
  if (rel === "") {
    return true;
  }
  return !rel.startsWith("..") && !isAbsolute(rel);
}

/** ¿La ruta está fuera de la carpeta del proyecto? */
export function isOutsideRoot(p: string, root: string): boolean {
  if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) {
    return true;
  }
  if (enRepoHermano(p, root)) {
    return false;
  }
  const info = relativeToRoot(p, root);
  if (info === null) {
    return false;
  }
  return info.outside;
}

/** ¿La ruta cae en una zona prohibida? (también dentro del repo hermano autorizado) */
export function isForbiddenPath(p: string, root: string): boolean {
  const hermano = enRepoHermano(p, root);
  const info = relativeToRoot(p, root);
  if (info === null) {
    return false;
  }
  if (info.outside && !hermano) {
    return false;
  }
  const rel = relDelRepo(p, root, info.rel, info.outside, hermano);
  const segments = rel.split("/");
  const base = segments[segments.length - 1] ?? "";
  if ((ALLOWED_EXCEPTIONS as readonly string[]).includes(base)) {
    return false;
  }
  const inForbiddenDir = FORBIDDEN_DIRS.some(
    (dir) => rel === dir.slice(0, -1) || rel.startsWith(dir),
  );
  if (inForbiddenDir) {
    return true;
  }
  return segments.some(
    (segment) =>
      !(ALLOWED_EXCEPTIONS as readonly string[]).includes(segment) &&
      FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(segment)),
  );
}

/** Trozos de una línea de shell que podrían ser rutas (mejor esfuerzo). */
export function shellTokens(command: string): string[] {
  return command
    .split(/[\s;|&<>()`'"]+/)
    .map((token) => token.replace(/^\.\//, ""))
    .filter(Boolean);
}

function denyOutside(value: string): string {
  return (
    `Bloqueado por la política del proyecto: '${value}' está fuera de la carpeta del repositorio. ` +
    "El agente no puede salir del proyecto; pide autorización explícita a la persona."
  );
}

function denyForbidden(value: string): string {
  return (
    `Bloqueado por la política del proyecto: '${value}' es un archivo o carpeta protegida ` +
    "(secretos, credenciales o datos locales). No intentes leerla por otro medio."
  );
}

/** Convierte un patrón glob en su parte literal, sin comodines. */
function toLiteral(value: string): string {
  const withoutMagic = value.replace(/\*+/g, "").replace(/\?+/g, "");
  const collapsed = withoutMagic.replace(/\/{2,}/g, "/");
  const trimmed = collapsed.replace(/\/+$/, "");
  if (!value.startsWith("/") && trimmed.startsWith("/")) {
    return trimmed.slice(1);
  }
  return trimmed;
}

function checkPath(value: string, root: string): string | null {
  const literal = toLiteral(value);
  if (isOutsideRoot(value, root) || (literal !== "" && isOutsideRoot(literal, root))) {
    return denyOutside(value);
  }
  if (isForbiddenPath(value, root) || (literal !== "" && isForbiddenPath(literal, root))) {
    return denyForbidden(value);
  }
  return null;
}

/** Devuelve el motivo del bloqueo, o `null` si la llamada puede continuar. */
export function checkToolCall(tool: string, args: ToolArgs, root: string): string | null {
  const name = tool.toLowerCase();
  const command = args.command ?? "";
  const isShellTool = SHELL_TOOLS.includes(name) || args.command !== undefined;

  if (isShellTool) {
    const denied = DENIED_COMMANDS.find((entry) => entry.pattern.test(command));
    if (denied) {
      return (
        `Bloqueado por la política del proyecto: el comando implica ${denied.motivo}. ` +
        "Las acciones con efecto externo requieren autorización explícita de la persona."
      );
    }
    for (const token of shellTokens(command)) {
      const reason = checkPath(token, root);
      if (reason) {
        return reason;
      }
    }
    return null;
  }

  for (const value of pathCandidates(args)) {
    const reason = checkPath(value, root);
    if (reason) {
      return reason;
    }
  }
  return null;
}

/** Textos de los argumentos que pueden ser una ruta o un patrón. */
function pathCandidates(args: ToolArgs): string[] {
  const found: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (!PATH_LIKE_KEY.test(key)) {
      continue;
    }
    if (typeof value === "string") {
      found.push(value);
      continue;
    }
    const list = z.array(z.string()).safeParse(value);
    if (list.success) {
      found.push(...list.data);
    }
  }
  return found;
}
