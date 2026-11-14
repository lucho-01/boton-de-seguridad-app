import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkToolCall, isForbiddenPath, isOutsideRoot } from "../../.opencode/guard/rules";

const RAIZ = process.cwd();

describe("guard: archivos protegidos", () => {
  it("bloquea .env y sus variantes", () => {
    expect(isForbiddenPath(".env", RAIZ)).toBe(true);
    expect(isForbiddenPath(".env.local", RAIZ)).toBe(true);
    expect(checkToolCall("read", { filePath: ".env" }, RAIZ)).not.toBeNull();
  });

  it("permite el ejemplo sin valores", () => {
    expect(checkToolCall("read", { filePath: ".env.example" }, RAIZ)).toBeNull();
  });

  it("bloquea secretos propios de una app móvil", () => {
    expect(isForbiddenPath("credentials.json", RAIZ)).toBe(true);
    expect(isForbiddenPath("google-services.json", RAIZ)).toBe(true);
    expect(isForbiddenPath("GoogleService-Info.plist", RAIZ)).toBe(true);
    expect(isForbiddenPath("android/app/release.keystore", RAIZ)).toBe(true);
    expect(isForbiddenPath("certs/firma.jks", RAIZ)).toBe(true);
    expect(isForbiddenPath("clave.p12", RAIZ)).toBe(true);
    expect(isForbiddenPath("secrets/api.pem", RAIZ)).toBe(true);
    expect(isForbiddenPath("data/export.json", RAIZ)).toBe(true);
  });

  it("deja pasar el código normal", () => {
    expect(isForbiddenPath("app/(tabs)/index.tsx", RAIZ)).toBe(false);
    expect(checkToolCall("read", { filePath: "src/services/mensaje.ts" }, RAIZ)).toBeNull();
  });
});

describe("guard: no salir de la carpeta", () => {
  it("bloquea rutas por encima del proyecto", () => {
    expect(isOutsideRoot("../boton-de-seguridad-api/README.md", RAIZ)).toBe(true);
    expect(checkToolCall("read", { path: "../otro/archivo.txt" }, RAIZ)).not.toBeNull();
  });

  it("bloquea rutas absolutas externas y la carpeta home", () => {
    const fuera = join(RAIZ, "..", "otro-repo", "secreto.txt");
    expect(isOutsideRoot(fuera, RAIZ)).toBe(true);
    expect(isOutsideRoot("~/Documentos/nota.txt", RAIZ)).toBe(true);
  });

  it("no bloquea rutas internas", () => {
    expect(isOutsideRoot("app/(tabs)/historial.tsx", RAIZ)).toBe(false);
  });
});

describe("guard: comandos", () => {
  it("bloquea leer secretos desde la terminal", () => {
    expect(checkToolCall("bash", { command: "cat .env" }, RAIZ)).not.toBeNull();
    expect(
      checkToolCall("bash", { command: "Get-Content google-services.json" }, RAIZ),
    ).not.toBeNull();
  });

  it("bloquea efectos externos propios de una app", () => {
    expect(checkToolCall("bash", { command: "git push origin main" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "eas build --platform android" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "eas submit --platform ios" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "expo publish" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "vercel deploy" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "firebase deploy" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "curl https://ejemplo.com" }, RAIZ)).not.toBeNull();
  });

  it("bloquea volcados de entorno y salir con cd", () => {
    expect(checkToolCall("bash", { command: "printenv" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "Get-ChildItem env:" }, RAIZ)).not.toBeNull();
    expect(checkToolCall("bash", { command: "cd .." }, RAIZ)).not.toBeNull();
  });

  it("permite los comandos de verificación", () => {
    expect(checkToolCall("bash", { command: "npm test" }, RAIZ)).toBeNull();
    expect(checkToolCall("bash", { command: "npm run check" }, RAIZ)).toBeNull();
    expect(checkToolCall("bash", { command: "npx jest" }, RAIZ)).toBeNull();
    expect(checkToolCall("bash", { command: "git status" }, RAIZ)).toBeNull();
  });
});

describe("configuración de IA", () => {
  it("existe con los permisos esperados", () => {
    const config: { permission: Record<string, Record<string, string>> } = JSON.parse(
      readFileSync(join(RAIZ, "opencode.json"), "utf8"),
    );
    expect(config.permission.read[".env"]).toBe("deny");
    expect(config.permission.read[".env.example"]).toBe("allow");
    expect(config.permission.read["google-services.json"]).toBe("deny");
    expect(config.permission.read["*.keystore"]).toBe("deny");
    expect(config.permission.bash["*"]).toBe("ask");
    expect(config.permission.bash["eas build*"]).toBe("deny");
    expect(config.permission.edit["../*"]).toBe("deny");
  });

  it("tiene agentes, skills y evidencias versionadas", () => {
    const archivos = [
      "AGENTS.md",
      ".opencode/agents/lead.md",
      ".opencode/agents/screens.md",
      ".opencode/agents/data.md",
      ".opencode/agents/api.md",
      ".opencode/agents/tests.md",
      ".opencode/agents/security.md",
      ".opencode/skills/feature-workflow/SKILL.md",
      ".opencode/skills/write-spec/SKILL.md",
      ".opencode/skills/mvc-expo/SKILL.md",
      ".opencode/skills/security-review/SKILL.md",
      ".opencode/skills/handoff-note/SKILL.md",
      "docs/api-contrato.md",
      "ia/bitacora-ia.md",
      "ia/pruebas/restricciones-en-vivo.md",
    ];
    for (const archivo of archivos) {
      expect(existsSync(join(RAIZ, archivo))).toBe(true);
    }
  });

  it("no declara ninguna variable con credenciales en la app", () => {
    const ejemplo = readFileSync(join(RAIZ, ".env.example"), "utf8");
    const declaradas = ejemplo
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0 && !linea.startsWith("#"));
    expect(declaradas).toEqual(["EXPO_PUBLIC_API_URL=https://tu-api.vercel.app"]);
  });
});
