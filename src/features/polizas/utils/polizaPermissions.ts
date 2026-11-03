import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { INVOICE_WRITE_PERMISSION } from "@/src/features/invoicing/constants/invoicePermissions";

/**
 * Permiso de ESCRITURA de pólizas: crear (borrador o contabilizada),
 * contabilizar, cancelar y eliminar. El backend exige `E-FIN-FACTURAS` en toda
 * escritura de `polizas/` (#826; desde EC-711 en toda escritura de Finanzas,
 * `PermisoFinanzas`) y responde `403` antes de validar el body. La única
 * excepción es `POST polizas/{id}/validar-cuadre/`, que solo calcula y exige el
 * permiso de lectura. El mismo código que `INVOICE_WRITE_PERMISSION`.
 */
export const POLIZA_WRITE_PERMISSION = INVOICE_WRITE_PERMISSION;

/**
 * ¿Puede ESTE usuario escribir pólizas? (`POLIZA_WRITE_PERMISSION`, rol "admin"
 * incluido). Convención de EC-713 (notas de crédito): sin él, "+ Nueva póliza"
 * se oculta y las acciones del menú se muestran deshabilitadas con su motivo.
 */
export const canWritePolizas = (user: PermissionContext | null | undefined): boolean =>
  hasPermission(POLIZA_WRITE_PERMISSION, user);

/** Por qué una acción de escritura está bloqueada cuando `canWritePolizas` es `false`. */
export const POLIZA_WRITE_PERMISSION_REASON =
  "No tienes permiso para registrar o cancelar pólizas.";
