import { expect, test } from "@playwright/test";
import { resolveQuoteSucursal } from "@/src/features/quotes/utils/quoteSucursal";

/**
 * Pruebas unitarias de EC-622: de dónde sale la sucursal que viaja en el
 * payload de una cotización. Nunca debe aparecer una sucursal fija.
 */
test.describe("resolveQuoteSucursal", () => {
  test("al crear, usa la sucursal válida del workspace", () => {
    expect(resolveQuoteSucursal(undefined, 7)).toBe(7);
  });

  test("al editar, conserva la del registro aunque el workspace tenga otra", () => {
    expect(resolveQuoteSucursal(3, 7)).toBe(3);
  });

  test("un registro sin sucursal toma la del workspace", () => {
    expect(resolveQuoteSucursal(null, 7)).toBe(7);
  });

  test("sin registro ni workspace devuelve null para bloquear el guardado", () => {
    expect(resolveQuoteSucursal(undefined, null)).toBeNull();
    expect(resolveQuoteSucursal(null, null)).toBeNull();
    expect(resolveQuoteSucursal(0, null)).toBeNull();
  });
});
