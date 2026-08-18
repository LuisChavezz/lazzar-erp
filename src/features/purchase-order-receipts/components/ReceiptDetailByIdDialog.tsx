"use client";

import { PurchaseOrderReceiptDetailDialog } from "./PurchaseOrderReceiptDetailDialog";

interface ReceiptDetailByIdDialogProps {
  /** Id de la recepción a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Adaptador de firma de `PurchaseOrderReceiptDetailDialog` a la que exigen los
 * registros de "documentos clicables" (`{ orderId, open, onOpenChange }`, la
 * misma forma que usa `CLICKABLE_DOC_TIPOS` del detalle de pedido).
 *
 * `PurchaseOrderReceiptDetailDialog` YA es self-fetching por id
 * (`useReceiptDetail`) y maneja loading/error internamente, así que —igual que
 * `StockMovementDetailByIdDialog`— aquí no hace falta action ni hook: el wrapper
 * solo traduce el nombre de la prop, que allá es `receiptId` en vez de
 * `orderId`. Ambas son `number | null` con `null` = "consulta apagada", así que
 * el mapeo es directo, sin el `?? 0` que sí necesita el de movimientos.
 *
 * Es el mismo diálogo que `PurchaseOrderDetailDialog` (la versión modal del
 * detalle de OC) abre desde su sección de recepciones; este wrapper solo lo
 * expone con la firma por id que exige el registro de documentos clicables de
 * la PÁGINA de detalle. (La sección "Recepciones asociadas" de la página, en
 * cambio, no usa este diálogo: pinta resúmenes con `RecepcionCard`.)
 */
export function ReceiptDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: ReceiptDetailByIdDialogProps) {
  return (
    <PurchaseOrderReceiptDetailDialog
      receiptId={orderId}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
