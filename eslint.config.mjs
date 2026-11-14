import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const REGLAS_BASE = {
  curly: ["error", "all"],
  "no-empty": ["error", { allowEmptyCatch: true }],
  "@typescript-eslint/no-explicit-any": "error",
  "no-restricted-syntax": [
    "error",
    {
      selector: "ConditionalExpression",
      message:
        "Prohibido el operador ternario: usa if con retorno temprano o una tabla de búsqueda.",
    },
    {
      selector: "TSAnyKeyword",
      message: "Prohibido `any`, escrito o implícito: valida lo externo con Zod.",
    },
    {
      selector: "TSUnknownKeyword",
      message: "Prohibido `unknown`: valida lo externo con Zod en el mismo punto.",
    },
    {
      selector: "TSAsExpression > TSUnknownKeyword",
      message: "Prohibido `as unknown`: usa el esquema Zod que valida el dato.",
    },
  ],
  "max-lines-per-function": [
    "error",
    { max: 100, skipBlankLines: true, skipComments: true, IIFEs: true },
  ],
};

const SIN_FECHA_EN_SERVICIOS = [
  ...REGLAS_BASE["no-restricted-syntax"],
  {
    selector: "NewExpression[callee.name='Date']",
    message: "El tiempo se inyecta (`now: Date`): no uses `new Date()` en los servicios.",
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: "El tiempo se inyecta (`now: Date`): no uses `Date.now()` en los servicios.",
  },
];

const VALIDAR_CON_ZOD = {
  patterns: [
    {
      group: ["**/api/**"],
      message: "Las pantallas no llaman a la API: usa el controller (src/controllers).",
    },
    {
      group: ["**/repositories/**", "**/db/**", "expo-sqlite"],
      message: "Las pantallas no acceden a SQLite: usa el controller (src/controllers).",
    },
  ],
};

const SIN_VALIDACION = {
  patterns: [
    {
      group: ["**/controllers/**", "**/components/**", "**/db/**", "**/repositories/**"],
      message: "Los servicios son puros: sin hardware, sin red y sin SQLite.",
    },
    {
      group: ["expo-*", "react-native*"],
      message:
        "Los servicios son puros: el hardware vive en src/sensors y el control en controllers.",
    },
    {
      group: ["**/api/**"],
      message:
        "Los servicios no llaman a la API directamente: el controller usa el cliente de src/api.",
    },
  ],
};

const SIN_SQLITE_EN_API = {
  patterns: [
    {
      group: ["expo-sqlite", "**/db/**", "**/repositories/**", "**/controllers/**"],
      message: "El cliente HTTP no depende de SQLite ni de controllers.",
    },
  ],
};

const SIN_PANTALLAS_EN_COMPONENTES = {
  patterns: [
    {
      group: ["**/controllers/**", "**/api/**", "**/repositories/**", "**/db/**"],
      message: "Los componentes son puros: reciben datos y callbacks por props.",
    },
  ],
};

export default tseslint.config(
  { ignores: ["node_modules/**", ".expo/**", "dist/**", "coverage/**", "android/**", "ios/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: REGLAS_BASE,
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly", __dirname: "readonly" },
    },
    rules: { "no-undef": "off" },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts"],
    rules: {
      "max-lines-per-function": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["app/**/*.tsx", "app/**/*.ts"],
    rules: { "no-restricted-imports": ["error", VALIDAR_CON_ZOD] },
  },
  {
    files: ["src/components/**/*.tsx", "src/components/**/*.ts"],
    rules: { "no-restricted-imports": ["error", SIN_PANTALLAS_EN_COMPONENTES] },
  },
  {
    files: ["src/services/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", SIN_VALIDACION],
      "no-restricted-syntax": ["error", ...SIN_FECHA_EN_SERVICIOS],
    },
  },
  {
    files: ["src/api/**/*.ts"],
    rules: { "no-restricted-imports": ["error", SIN_SQLITE_EN_API] },
  },
  {
    files: [".opencode/**/*.ts"],
    rules: { "max-lines-per-function": "off" },
  },
);
