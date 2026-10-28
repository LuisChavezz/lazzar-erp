import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // EC-606: el dinero se formatea con los helpers de `src/utils/formatCurrency`
    // (moneda obligatoria) y el MXN legítimo con `formatMxn`. Un formateador
    // local con `currency: "MXN"` literal reintroduce el peso por defecto.
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...[
          "NewExpression[callee.object.name='Intl'][callee.property.name='NumberFormat']",
          "CallExpression[callee.object.name='Intl'][callee.property.name='NumberFormat']",
          "CallExpression[callee.property.name='toLocaleString']",
        ].map((call) => ({
          selector: `${call} Property:matches([key.name='currency'], [key.value='currency'])[value.value='MXN']`,
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
