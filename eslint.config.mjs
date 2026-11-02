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
  {
    // EC-701: un callback de un hook o componente que lee un `const` declarado
    // MÁS ABAJO puede quedar memoizado por el React Compiler sin esa
    // dependencia (si el valor es primitivo, ve siempre el del primer render;
    // así se congeló el envío de EC-676). Ver la convención en CLAUDE.md.
    // Solo hooks, componentes y rutas: en utils de módulo no hay memoización.
    files: ["src/**/{hooks,components}/**", "src/app/**"],
    rules: {
      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          variables: true,
          functions: false,
          classes: false,
          typedefs: false,
          enums: false,
          ignoreTypeReferences: true,
        },
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
