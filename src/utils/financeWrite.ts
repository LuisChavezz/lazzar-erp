import toast from "react-hot-toast";
import {
  FINANCE_WRITE_PERMISSION,
  FINANCE_WRITE_PERMISSION_REASON,
  financeCancelPermissionReason,
  type FinanceCancelPermission,
} from "@/src/constants/financePermissions";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "./permissions";
import { financeReadBlockReason, getFinanceReadState, type SessionStatus } from "./financeRead";

export type { SessionStatus } from "./financeRead";

/**
 * Estado de escritura de Finanzas para la sesión actual (EC-733). Se calcula una
 * vez por vista con `useSession()` (`{ data, status }`) y viaja a las celdas por
 * el contexto de acciones de fila.
 */
export interface FinanceWriteState {
  /** ¿Puede escribir? (`FINANCE_WRITE_PERMISSION`, rol "admin" incluido). */
  canWrite: boolean;
  /**
   * La sesión aún no llega. Se falla cerrado (`canWrite` es `false`), pero el
   * motivo de permiso NO se muestra: un admin vería "No tienes permiso…" durante
   * la carga. Mismo criterio que el `isSessionLoading` de `QuoteList`.
   */
  isSessionLoading: boolean;
}

/** La compuerta de sesión y permiso de `financeRead`, con `FINANCE_WRITE_PERMISSION`. */
export const getFinanceWriteState = (
  user: PermissionContext | null | undefined,
  status: SessionStatus,
): FinanceWriteState => {
  const { canRead, isSessionLoading } = getFinanceReadState(user, status, FINANCE_WRITE_PERMISSION);
  return { canWrite: canRead, isSessionLoading };
};

/**
 * Estado de una CANCELACIÓN de Finanzas (EC-950): la escritura
 * (`FINANCE_WRITE_PERMISSION`) más el `CANCELAR-FIN-*` del documento, que el
 * backend exige en ese orden. `reason` es el `detail` del `403` que faltaría:
 * el de escritura (`writeReason`, el de cada viewset) si falta
 * `E-FIN-FACTURAS`, o el de cancelación si solo falta el del documento.
 */
export interface FinanceCancelState extends FinanceWriteState {
  reason: string;
}

export const getFinanceCancelState = (
  user: PermissionContext | null | undefined,
  status: SessionStatus,
  permission: FinanceCancelPermission,
  writeReason: string = FINANCE_WRITE_PERMISSION_REASON,
): FinanceCancelState => {
  const write = getFinanceWriteState(user, status);
  return {
    canWrite: write.canWrite && hasPermission(permission, user),
    isSessionLoading: write.isSessionLoading,
    reason: write.canWrite ? financeCancelPermissionReason(permission) : writeReason,
  };
};

/**
 * `disabled`/`description` de un item de menú (o un botón) que escribe en
 * Finanzas, convención de los flujos: sin permiso se deshabilita con su motivo.
 * Mientras la sesión carga se deshabilita SIN motivo. Combinar con otros
 * bloqueos del item: `disabled: busy || block.disabled`.
 */
export const financeWriteBlock = (
  write: FinanceWriteState,
  reason: string,
): { disabled: boolean; description: string | undefined } => ({
  disabled: !write.canWrite,
  description:
    financeReadBlockReason({ canRead: write.canWrite, isSessionLoading: write.isSessionLoading }, reason) ??
    undefined,
});

/**
 * Guarda de los handlers: `true` si puede escribir. Si no, avisa con el motivo
 * (salvo mientras la sesión carga) y devuelve `false`. El menú ya deshabilita la
 * acción; esto cubre una sesión que cambió entre pintarlo y seleccionar.
 */
export const guardFinanceWrite = (write: FinanceWriteState, reason: string): boolean => {
  if (write.canWrite) return true;
  if (!write.isSessionLoading) toast.error(reason);
  return false;
};
