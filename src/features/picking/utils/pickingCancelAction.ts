import { patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
import type { WmsCancelAction } from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import { pickingDetailQueryKey } from "../constants/pickingQueryKeys";
import { PICKINGS_KEY } from "../constants/pickingsTable";
import { cancelPicking } from "../services/actions";
import type { Picking, PickingListItem } from "../interfaces/picking.interface";
import { toPickingDetailData } from "./picking.utils";

/** ¿El surtido está cancelado? (`"Cancelado"`, con mayúscula inicial). */
export const isPickingCancelled = (picking: Pick<Picking, "estado">): boolean => picking.estado === "Cancelado";

/** Candado por surtido. */
export const cancelPickingMutationKey = (pickingId: number) => ["cancelar-picking", pickingId] as const;

/** Lo que una cancelación cambia de la fila del listado ligero (`?vista=lista`). */
const LIST_STATUS_FIELDS = [
  "estado",
  "motivo_cancelacion",
  "fecha_cancelacion",
  "cancelado_por",
  "cancelado_por_nombre",
] as const satisfies readonly (keyof PickingListItem)[];

/**
 * Cancelar un surtido (EC-945). La respuesta es el `PickingSerializer`, la
 * forma del detalle (`["picking-detail", id]`, que lo reemplaza); la fila del
 * listado es otra forma (`?vista=lista`), así que de ella solo se escriben los
 * campos de estado. Piezas, empaque y orden los trae el refetch.
 */
export const pickingCancelAction = (pickingId: number): WmsCancelAction<Picking> => ({
  mutationKey: cancelPickingMutationKey(pickingId),
  run: (motivo) => cancelPicking({ id: pickingId, motivo }),
  applyResult: async (queryClient, picking) => {
    const fields = pickPresentFields<PickingListItem>(picking, LIST_STATUS_FIELDS);
    await patchCachedRowById<PickingListItem>(queryClient, PICKINGS_KEY, picking?.id, (row) => ({
      ...row,
      ...fields,
    }));
    if (picking?.id === pickingId && Array.isArray(picking.picking_detalle)) {
      await queryClient.cancelQueries({ queryKey: pickingDetailQueryKey(pickingId), exact: true });
      queryClient.setQueryData(pickingDetailQueryKey(pickingId), toPickingDetailData(picking));
    }
  },
  successMessage: (picking) => `Surtido ${picking?.folio || `#${pickingId}`} cancelado`,
  fallbackErrorMessage: "Error al cancelar el surtido",
});
