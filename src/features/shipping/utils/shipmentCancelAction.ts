import { replaceCachedRow } from "@/src/utils/cachedRows";
import type { WmsCancelAction } from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import { cancelShipment } from "../services/actions";
import type { Shipment } from "../interfaces/shipping.interface";

/** ¿El despacho está cancelado? (`estado`, #1348). */
export const isShipmentCancelled = (shipment: Pick<Shipment, "estado">): boolean =>
  shipment.estado === "CANCELADO";

/** Candado por despacho. */
export const cancelShipmentMutationKey = (shipmentId: number) => ["cancelar-despacho", shipmentId] as const;

/**
 * Cancelar un despacho (EC-945). La respuesta es el `DespachoSerializer`, la
 * misma forma que la fila del listado: reemplaza la fila en cada variante en
 * caché de `["shipments", …]`, que es también lo que muestra
 * `ShippingDetailDialog` (no hace fetch propio).
 */
export const shipmentCancelAction = (shipmentId: number): WmsCancelAction<Shipment> => ({
  mutationKey: cancelShipmentMutationKey(shipmentId),
  run: (motivo) => cancelShipment({ id: shipmentId, motivo }),
  applyResult: (queryClient, shipment) =>
    replaceCachedRow<Shipment>(queryClient, ["shipments"], shipment, [
      "id",
      "estado",
      "packing_folio",
      "despacho_detalle",
    ]),
  successMessage: () => "Envío cancelado: sus piezas regresaron al almacén",
  fallbackErrorMessage: "Error al cancelar el envío",
});
