import { expect, test } from "@playwright/test";
import {
  formatQuoteClienteDe,
  getQuoteClienteContacto,
  getQuoteClienteLabel,
  type QuoteClienteFields,
} from "@/src/features/quotes/utils/quoteClienteLabel";
import {
  buildQuoteClienteFilterOptions,
  buildQuoteClienteOptionsFromRows,
  matchesQuoteClienteFilter,
} from "@/src/features/quotes/utils/quoteFilterOptions";

/**
 * Convención única del nombre del cliente de una cotización (EC-810):
 * razón social cruda, contacto solo como línea secundaria, y el filtro de
 * Mesa de Control por id de cliente.
 */

const q = (overrides: Partial<QuoteClienteFields>): QuoteClienteFields => ({
  cliente: 10,
  cliente_razon_social: "ABARROTES ABEJA, SA DE CV",
  cliente_nombre: "GERARDO GOMEZ",
  ...overrides,
});

test.describe("getQuoteClienteLabel", () => {
  test("la razón social tal cual, sin cambiar mayúsculas", () => {
    expect(getQuoteClienteLabel(q({}))).toBe("ABARROTES ABEJA, SA DE CV");
    expect(getQuoteClienteLabel(q({ cliente_razon_social: "Somos cliente S. de R.L." }))).toBe(
      "Somos cliente S. de R.L.",
    );
  });

  test("razón social en blanco → contacto; ninguno → Cliente #id; sin cliente", () => {
    expect(getQuoteClienteLabel(q({ cliente_razon_social: "  " }))).toBe("GERARDO GOMEZ");
    expect(getQuoteClienteLabel(q({ cliente_razon_social: "", cliente_nombre: null }))).toBe(
      "Cliente #10",
    );
    expect(
      getQuoteClienteLabel({ cliente: null, cliente_nombre: null, cliente_razon_social: null }),
    ).toBe("Sin cliente");
  });
});

test.describe("getQuoteClienteContacto", () => {
  test("el contacto cuando aporta algo", () => {
    expect(getQuoteClienteContacto(q({}))).toBe("GERARDO GOMEZ");
  });

  test("nada si coincide con la razón social, si ya es la etiqueta o si no hay", () => {
    expect(
      getQuoteClienteContacto(q({ cliente_nombre: "conauto, sa de cv", cliente_razon_social: "CONAUTO, SA DE CV" })),
    ).toBeNull();
    expect(getQuoteClienteContacto(q({ cliente_razon_social: "" }))).toBeNull();
    expect(getQuoteClienteContacto(q({ cliente_nombre: " " }))).toBeNull();
    expect(
      getQuoteClienteContacto({ cliente: null, cliente_nombre: null, cliente_razon_social: null }),
    ).toBeNull();
  });
});

test("formatQuoteClienteDe no escribe «de Sin cliente»", () => {
  expect(formatQuoteClienteDe(q({}))).toBe(" de ABARROTES ABEJA, SA DE CV");
  expect(formatQuoteClienteDe({ cliente: null })).toBe("");
});

test.describe("filtro de cliente de Mesa de Control (por id)", () => {
  const rows: QuoteClienteFields[] = [
    q({ cliente: 115, cliente_razon_social: "LAZZAR", cliente_nombre: "JESUS" }),
    q({ cliente: 21, cliente_razon_social: "LAZZAR", cliente_nombre: "ADRIAN" }),
    q({ cliente: 21, cliente_razon_social: "LAZZAR", cliente_nombre: "ADRIAN" }),
    q({ cliente: 1 }),
    { cliente: null, cliente_nombre: null, cliente_razon_social: null },
  ];

  test("una opción por cliente, homónimos separados y Sin cliente arriba", () => {
    expect(buildQuoteClienteFilterOptions(buildQuoteClienteOptionsFromRows(rows))).toEqual([
      { value: "sin_cliente", label: "Sin cliente" },
      { value: "1", label: "ABARROTES ABEJA, SA DE CV" },
      { value: "21", label: "LAZZAR (cliente #21)" },
      { value: "115", label: "LAZZAR (cliente #115)" },
    ]);
  });

  test("compara por id, no por texto", () => {
    const [jesus, adrian] = rows;
    expect(matchesQuoteClienteFilter(jesus, "115")).toBe(true);
    expect(matchesQuoteClienteFilter(adrian, "115")).toBe(false);
    expect(matchesQuoteClienteFilter(rows[4], "sin_cliente")).toBe(true);
    expect(matchesQuoteClienteFilter(jesus, "sin_cliente")).toBe(false);
    expect(matchesQuoteClienteFilter(jesus, undefined)).toBe(true);
  });
});
