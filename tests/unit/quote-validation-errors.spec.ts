import { expect, test } from "@playwright/test";
import { extractQuoteValidationIssues } from "@/src/features/quotes/utils/quoteValidationErrors";

/**
 * EC-795: el 400 de `POST /ventas/cotizaciones/onboarding/` (alta y edición de
 * cotización) pasa por `extractQuoteValidationIssues` para los campos.
 */
test.describe("extractQuoteValidationIssues con strings sueltos anidados", () => {
  test("un string bajo `cotizacion` llega a su campo, igual que una lista", () => {
    expect(
      extractQuoteValidationIssues({ cotizacion: { telefono_pagos: "Teléfono inválido." } }),
    ).toEqual([{ path: "telefono_pagos", message: "Teléfono inválido." }]);
    expect(
      extractQuoteValidationIssues({ cotizacion: { telefono_pagos: ["Teléfono inválido."] } }),
    ).toEqual([{ path: "telefono_pagos", message: "Teléfono inválido." }]);
  });

  test("aplica el alias del formulario y las rutas por renglón", () => {
    expect(
      extractQuoteValidationIssues({
        cotizacion: { cliente_rfc: "RFC inválido." },
        detalle: [{ precio_unitario: "Debe ser positivo" }],
      }),
    ).toEqual([
      { path: "rfc", message: "RFC inválido." },
      { path: "items.0.precio", message: "Debe ser positivo" },
    ]);
  });

  test("un string anidado vacío no produce error de campo", () => {
    expect(extractQuoteValidationIssues({ cotizacion: { telefono_pagos: "" } })).toEqual([]);
  });
});
