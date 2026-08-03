import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Assets estáticos servidos tal cual. Incluye SDKs de terceros
    // minificados (`public/vendor/`) que no se editan aquí y no tiene sentido
    // pasar por las reglas del proyecto.
    "public/**",
  ]),
]);

export default eslintConfig;
