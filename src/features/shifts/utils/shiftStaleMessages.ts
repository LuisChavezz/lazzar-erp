import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";

/** Avisos del diálogo de desactivar que se cerró por un cambio externo. */
export const SHIFT_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "El turno ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `El turno cambió de estatus: ya está ${activo ? "activo" : "inactivo"}. Se actualizó el listado.`,
};
