import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";

/** Avisos de la confirmación de activar/desactivar que se cerró por un cambio externo. */
export const BANK_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "El banco ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `El banco cambió de estatus: ya está ${activo ? "activo" : "inactivo"}. Se actualizó el listado.`,
};
