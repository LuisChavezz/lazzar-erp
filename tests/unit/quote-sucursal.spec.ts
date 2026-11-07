import { expect, test } from "@playwright/test";
import {
  isQuoteSucursalMissing,
  resolveQuoteSucursal,
} from "@/src/features/quotes/utils/quoteSucursal";

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

/**
 * EC-753: cuándo la edición avisa (y bloquea) por falta de sucursal. Solo si
 * el registro no trae una y el workspace tampoco tiene una válida.
 */
test.describe("isQuoteSucursalMissing", () => {
  const sinWorkspace = { branchId: null, isLoading: false };

  test("registro sin sucursal y workspace sin una válida: falta", () => {
    expect(isQuoteSucursalMissing(null, sinWorkspace)).toBe(true);
    expect(isQuoteSucursalMissing(undefined, sinWorkspace)).toBe(true);
    expect(isQuoteSucursalMissing(0, sinWorkspace)).toBe(true);
  });

  test("registro con sucursal: nunca falta, haya o no sucursal en el workspace", () => {
    expect(isQuoteSucursalMissing(3, sinWorkspace)).toBe(false);
    expect(isQuoteSucursalMissing(3, { branchId: 7, isLoading: false })).toBe(false);
  });

  test("registro sin sucursal con una válida en el workspace: no falta", () => {
    expect(isQuoteSucursalMissing(null, { branchId: 7, isLoading: false })).toBe(false);
  });

  test("mientras carga la lista de sucursales no se da por faltante", () => {
    expect(isQuoteSucursalMissing(null, { branchId: null, isLoading: true })).toBe(false);
  });
});
