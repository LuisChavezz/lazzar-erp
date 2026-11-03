import { financeWriteDeniedReason } from "@/src/utils/financeWritePermission";

/**
 * Por qué una escritura de conciliaciones (preparar, cerrar, cancelar) está
 * bloqueada sin el permiso de escritura de Finanzas (`FINANCE_WRITE_PERMISSION`):
 * las tres cambian el estatus de los movimientos del banco.
 */
export const CONCILIACION_WRITE_PERMISSION_REASON = financeWriteDeniedReason(
  "conciliar cuentas bancarias",
);
