import { expect, test } from "@playwright/test";
import { FINANCE_READ_REASONS } from "@/src/constants/financePermissions";
import { financeReadBlockReason } from "@/src/utils/financeRead";
import { canAccessRoute } from "@/src/utils/routeAccess";
import {
  ACCOUNTS_RECEIVABLE_PATH,
  CREDIT_NOTES_PATH,
  getTrackingReadState,
} from "@/src/features/invoicing/utils/invoiceTrackingAccess";

/**
 * EC-734: la hoja "Seguimiento" decide con UN solo estado por lectura si abre la
 * CxC o la nota de crédito y si la sesión aún carga, con el mismo requisito que
 * la regla de la ruta de esa sección.
 */

const perfil = (...permissions: string[]) => ({ role: "user", permissions });
const soloFacturacion = perfil("R-CONTABILIDAD-FACTURACION");
const facturacionYCxc = perfil("R-CONTABILIDAD-FACTURACION", "R-CONTABILIDAD-CXC");
const soloModulo = perfil("R-CONTABILIDAD");
const admin = { role: "admin", permissions: [] };

test("abre lo mismo que la regla de la ruta de cada sección", () => {
  for (const user of [soloFacturacion, facturacionYCxc, soloModulo, admin]) {
    for (const path of [ACCOUNTS_RECEIVABLE_PATH, CREDIT_NOTES_PATH]) {
      expect([path, getTrackingReadState(user, "authenticated", path).canRead]).toEqual([
        path,
        canAccessRoute(path, user),
      ]);
    }
  }
});

test("CxC con su subcódigo o el módulo; notas de crédito solo con el módulo", () => {
  expect(getTrackingReadState(facturacionYCxc, "authenticated", ACCOUNTS_RECEIVABLE_PATH).canRead).toBe(true);
  expect(getTrackingReadState(facturacionYCxc, "authenticated", CREDIT_NOTES_PATH).canRead).toBe(false);
  expect(getTrackingReadState(soloModulo, "authenticated", CREDIT_NOTES_PATH).canRead).toBe(true);
});

test("sin acceso da el motivo; mientras la sesión carga, bloquea sin motivo", () => {
  const motivo = FINANCE_READ_REASONS.receivables;
  const sinAcceso = getTrackingReadState(soloFacturacion, "authenticated", ACCOUNTS_RECEIVABLE_PATH);
  expect(sinAcceso).toEqual({ canRead: false, isSessionLoading: false });
  expect(financeReadBlockReason(sinAcceso, motivo)).toBe(motivo);

  const cargando = getTrackingReadState(undefined, "loading", ACCOUNTS_RECEIVABLE_PATH);
  expect(cargando).toEqual({ canRead: false, isSessionLoading: true });
  expect(financeReadBlockReason(cargando, motivo)).toBeNull();
});
