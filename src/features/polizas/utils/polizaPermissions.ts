import { financeWriteDeniedReason } from "@/src/utils/financeWritePermission";

/**
 * Por qué una escritura de pólizas (crear, contabilizar, cancelar, eliminar)
 * está bloqueada sin el permiso de escritura de Finanzas
 * (`FINANCE_WRITE_PERMISSION`). La única escritura que no lo pide es
 * `validar-cuadre/`, que solo calcula.
 */
export const POLIZA_WRITE_PERMISSION_REASON = financeWriteDeniedReason(
  "registrar o cancelar pólizas",
);
