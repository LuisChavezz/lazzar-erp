import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";

/** Avisos de la confirmación de baja/reactivación que se cerró por un cambio externo. */
export const COST_CENTER_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "El centro de costo ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `El centro de costo cambió de estatus: ya está ${activo ? "activo" : "inactivo"}. Se actualizó el listado.`,
};
