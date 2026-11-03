import { expect, test } from "@playwright/test";
import {
  canWriteFinance,
  FINANCE_WRITE_PERMISSION,
  financeWriteDeniedReason,
} from "@/src/utils/financeWritePermission";
import { POLIZA_WRITE_PERMISSION_REASON } from "@/src/features/polizas/utils/polizaPermissions";
import { CONCILIACION_WRITE_PERMISSION_REASON } from "@/src/features/bank-reconciliations/utils/conciliacionPermissions";
import { CREDIT_NOTE_WRITE_PERMISSION_REASON } from "@/src/features/credit-notes/utils/creditNoteStamping";

/**
 * Pruebas unitarias de EC-707: el permiso de escritura de Finanzas compartido
 * por pólizas, conciliaciones y notas de crédito.
 */

test("el código es E-FIN-FACTURAS y el rol admin pasa sin permisos en la lista", () => {
  expect(FINANCE_WRITE_PERMISSION).toBe("E-FIN-FACTURAS");
  expect(canWriteFinance({ role: "admin", permissions: [] })).toBe(true);
  expect(canWriteFinance({ role: "user", permissions: ["E-FIN-FACTURAS"] })).toBe(true);
  expect(canWriteFinance({ role: "user", permissions: ["R-CONTABILIDAD"] })).toBe(false);
  expect(canWriteFinance(null)).toBe(false);
});

test("cada módulo conserva el motivo del 403 de su viewset", () => {
  expect(financeWriteDeniedReason("x")).toBe("No tienes permiso para x.");
  expect(POLIZA_WRITE_PERMISSION_REASON).toBe("No tienes permiso para registrar o cancelar pólizas.");
  expect(CONCILIACION_WRITE_PERMISSION_REASON).toBe("No tienes permiso para conciliar cuentas bancarias.");
  expect(CREDIT_NOTE_WRITE_PERMISSION_REASON).toBe(
    "No tienes permiso para registrar o cancelar notas de crédito.",
  );
});
