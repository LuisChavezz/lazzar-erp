import { expect, test } from "@playwright/test";
import {
  extractQuoteFormIssues,
  extractQuoteRejectionMessage,
  extractQuoteValidationIssues,
} from "@/src/features/quotes/utils/quoteValidationErrors";

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

test.describe("rechazos del onboarding de cotización: al toast, no a un campo", () => {
  const cases: Array<[string, string]> = [
    ["cotizacion_id", "La cotización ya no está dentro del periodo permitido para edición."],
    ["empresa", "El usuario no tiene empresa asignada."],
    ["cotizacion", "Datos inválidos."],
  ];
  for (const [key, message] of cases) {
    test(`${key} como string llega al toast`, () => {
      const data = { [key]: message };
      expect(extractQuoteRejectionMessage(data)).toBe(message);
      expect(extractQuoteFormIssues(data)).toEqual([]);
    });

    test(`${key} como lista llega al toast con su primer mensaje`, () => {
      const data = { [key]: [message, "Otro."] };
      expect(extractQuoteRejectionMessage(data)).toBe(message);
      expect(extractQuoteFormIssues(data)).toEqual([]);
    });
  }

  test("non_field_errors como lista va al toast y ya no a un campo invisible", () => {
    const data = { non_field_errors: ["Motivo."] };
    expect(extractQuoteRejectionMessage(data)).toBe("Motivo.");
    expect(extractQuoteFormIssues(data)).toEqual([]);
  });

  test("cotizacion como objeto sigue siendo error de campo y no rechazo", () => {
    const data = { cotizacion: { persona_pagos: ["Requerido"] } };
    expect(extractQuoteRejectionMessage(data)).toBeUndefined();
    expect(extractQuoteFormIssues(data)).toEqual([
      { path: "persona_pagos", message: "Requerido" },
    ]);
  });

  test("compatibilidad_proceso sigue ganando el toast", () => {
    expect(
      extractQuoteRejectionMessage({
        compatibilidad_proceso: ["A no admite bordado."],
        cotizacion_id: "Cotización no encontrada.",
      }),
    ).toBe("A no admite bordado.");
  });
});

test.describe("detalle como rechazo de la cotización (EC-795)", () => {
  test("una lista de mensajes va al toast y no a un campo", () => {
    const data = { detalle: ["Este campo es requerido."] };
    expect(extractQuoteRejectionMessage(data)).toBe("Este campo es requerido.");
    expect(extractQuoteFormIssues(data)).toEqual([]);
  });

  test("el mensaje plano se sigue mostrando", () => {
    expect(extractQuoteRejectionMessage({ detalle: "Producto inválido: 9" })).toBe(
      "Producto inválido: 9",
    );
  });

  test("una lista de objetos por renglón no es rechazo", () => {
    const data = { detalle: [{ precio_unitario: ["Debe ser positivo"] }] };
    expect(extractQuoteRejectionMessage(data)).toBeUndefined();
    expect(extractQuoteFormIssues(data)).toEqual([
      { path: "items.0.precio", message: "Debe ser positivo" },
    ]);
  });
});

test.describe("rechazos en blanco de la cotización (code review EC-795)", () => {
  for (const key of ["cotizacion", "cotizacion_id", "empresa", "detail", "non_field_errors"]) {
    test(`${key} de solo espacios cae al mensaje genérico, sin toast en blanco`, () => {
      expect(extractQuoteRejectionMessage({ [key]: " " })).toBeUndefined();
      expect(extractQuoteRejectionMessage({ [key]: ["  ", ""] })).toBeUndefined();
    });
  }

  test("una clave en blanco cede a la siguiente con mensaje", () => {
    expect(
      extractQuoteRejectionMessage({ cotizacion_id: ["  "], empresa: "Sin empresa." }),
    ).toBe("Sin empresa.");
  });
});

test.describe("cuerpo 400 que no es objeto (code review EC-795)", () => {
  test("una lista de primer nivel no produce errores de campo", () => {
    expect(extractQuoteValidationIssues(["Mensaje."])).toEqual([]);
    expect(extractQuoteValidationIssues([{ campo: ["x"] }])).toEqual([]);
    expect(extractQuoteValidationIssues("Mensaje.")).toEqual([]);
  });
});

test.describe("claves de rechazo por flujo (code review EC-795)", () => {
  test("el extractor sin claves solo descarta compatibilidad_proceso", () => {
    expect(
      extractQuoteValidationIssues({ permiso: "x", compatibilidad_proceso: ["y"] }),
    ).toEqual([{ path: "permiso", message: "x" }]);
  });

  test("Cotizaciones no descarta claves que su toast no lee", () => {
    // `permiso` no es rechazo de la cotización: queda como error, no se pierde
    // en silencio en los dos lados.
    expect(extractQuoteRejectionMessage({ permiso: "x" })).toBeUndefined();
    expect(extractQuoteFormIssues({ permiso: "x" })).toEqual([{ path: "permiso", message: "x" }]);
  });
});

test.describe("non_field_errors anidado en la cabecera de la cotización (code review EC-795)", () => {
  test("va al toast y no a un campo", () => {
    const data = { cotizacion: { non_field_errors: ["Motivo."] } };
    expect(extractQuoteRejectionMessage(data)).toBe("Motivo.");
    expect(extractQuoteFormIssues(data)).toEqual([]);
  });

  test("los demás errores de la cabecera siguen en sus campos", () => {
    const data = {
      cotizacion: { non_field_errors: "Motivo.", persona_pagos: ["Requerido"] },
    };
    expect(extractQuoteRejectionMessage(data)).toBe("Motivo.");
    expect(extractQuoteFormIssues(data)).toEqual([
      { path: "persona_pagos", message: "Requerido" },
    ]);
  });

  test("un rechazo de primer nivel gana al anidado", () => {
    expect(
      extractQuoteRejectionMessage({
        cotizacion_id: "Sin acceso.",
        cotizacion: { non_field_errors: ["Motivo."] },
      }),
    ).toBe("Sin acceso.");
  });
});

test.describe("lista mixta de detalle (code review EC-795)", () => {
  test("el mensaje va al toast y los renglones siguen en sus campos", () => {
    const data = { detalle: ["Mensaje de lista.", { precio_unitario: ["Debe ser positivo"] }] };
    expect(extractQuoteRejectionMessage(data)).toBe("Mensaje de lista.");
    expect(extractQuoteFormIssues(data)).toEqual([
      { path: "detalle", message: "Mensaje de lista." },
      { path: "items.1.precio", message: "Debe ser positivo" },
    ]);
  });
});
