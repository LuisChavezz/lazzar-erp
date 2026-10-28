import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // EC-606: el dinero se formatea con los helpers de `src/utils/formatCurrency`
    // (moneda obligatoria) y el MXN legítimo con `formatMxn`. Un `currency:
    // "MXN"` literal —inline en un `Intl.NumberFormat`/`toLocaleString` o en un
    // objeto de opciones guardado en una variable— reintroduce el peso por
    // defecto, así que se marca en CUALQUIER objeto. Un dato que no es formato
    // (p. ej. un mock con `currency: "MXN"`) lleva su `eslint-disable-next-line`
    // comentado.
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...[
          "[value.value='MXN']",
          "[value.type='TemplateLiteral'][value.expressions.length=0][value.quasis.0.value.cooked='MXN']",
        ].map((value) => ({
          selector: `Property:matches([key.name='currency'], [key.value='currency'])${value}`,
          message:
            'No formatees dinero con `currency: "MXN"` literal: usa `formatMxn` para importes en pesos o `formatCurrency`/`formatMoneyValue` con la moneda del registro (EC-606).',
        })),
      ],
    },
  },
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
