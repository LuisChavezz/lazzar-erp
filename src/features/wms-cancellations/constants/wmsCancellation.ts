import { CANCEL_REASON_MAX } from "@/src/features/document-cancellation/constants/documentCancellation";

/**
 * Permiso con el que se ofrecen las cancelaciones de WMS y la reversa de una TR
 * (EC-945). `hasPermission` ya deja pasar al rol "admin" (`is_admin_empresa` o
 * superuser), que es el mismo atajo del backend. El backend acepta además al
 * departamento de Mesa de Control (EC-946, fuera de aquí); su `403` es la red de
 * seguridad y se muestra tal cual.
 */
export const WMS_CANCEL_PERMISSION = "WMS-CANCELAR";

/** Tope del motivo en nucleo-erp (`cancelacion_service.motivo_de`, `[:500]`). */
export const WMS_CANCEL_MOTIVO_MAX = CANCEL_REASON_MAX;
