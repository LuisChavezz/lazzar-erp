import type { WmsCancelDialogContent } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
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

/**
 * Texto del diálogo de "Cancelar envío". Dice que las piezas regresan al
 * almacén. Solo se ofrece en un envío sin entrega registrada: uno entregado ya
 * no se cancela (nucleo-erp #1361 responde 400, es una devolución), así que el
 * texto advierte del caso que el sistema no ve, una entrega que no se registró.
 */
export const shipmentCancelDialogContent = (
  shipment: Pick<Shipment, "id" | "packing_folio">,
): WmsCancelDialogContent<Shipment> => ({
  action: shipmentCancelAction(shipment.id),
  title: "Cancelar envío",
  description: `El envío del embarque ${shipment.packing_folio || `#${shipment.id}`} quedará cancelado y sus piezas regresarán al almacén del que salieron; el embarque volverá a quedar por enviar. Si la mercancía ya llegó al cliente aunque no se haya registrado la entrega, no lo canceles: eso es una devolución.`,
  submitLabel: "Cancelar envío",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela el envío",
});
