import { expect, test } from "@playwright/test";
import { datedFileName } from "@/src/utils/datedFileName";

/** Nombre de las exportaciones con el día local (la suite corre en America/Mexico_City). */
test.describe("datedFileName", () => {
  test("prefijo, día local y extensión", () => {
    expect(datedFileName("clientes", "csv", new Date("2026-11-10T09:00:00-06:00"))).toBe(
      "clientes-2026-11-10.csv",
    );
  });

  test("después de las 18:00 sigue siendo hoy, no el día UTC", () => {
    const tarde = new Date("2026-11-10T19:30:00-06:00");
    expect(tarde.toISOString().slice(0, 10)).toBe("2026-11-11");
    expect(datedFileName("quotes", "pdf", tarde)).toBe("quotes-2026-11-10.pdf");
  });

  test("el mismo now da el mismo día que el encabezado del PDF", () => {
    const now = new Date("2026-11-10T23:59:59-06:00");
    expect(datedFileName("pedidos", "pdf", now)).toBe("pedidos-2026-11-10.pdf");
    expect(now.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })).toBe(
      "10 de noviembre de 2026",
    );
  });
});
