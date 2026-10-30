import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";

/** Avisos de la confirmación de activar/desactivar que se cerró por un cambio externo. */
export const BANK_ACCOUNT_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "La cuenta bancaria ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `La cuenta bancaria cambió de estatus: ya está ${activo ? "activa" : "inactiva"}. Se actualizó el listado.`,
};
