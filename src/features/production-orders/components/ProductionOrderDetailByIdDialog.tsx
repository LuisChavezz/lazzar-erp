"use client";

import { ProductionOrderDetailDialog } from "./ProductionOrderDetailDialog";

interface ProductionOrderDetailByIdDialogProps {
  /** Id de la orden a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Adaptador de firma de `ProductionOrderDetailDialog` a la que exige el registro
 * `CLICKABLE_DOC_TIPOS` del detalle de pedido (`{ orderId, open, onOpenChange }`,
 * la misma de bordado/reflejante).
 *
 * `ProductionOrderDetailDialog` YA es self-fetching por id, así que —a diferencia
 * de corte-manga— aquí no hace falta action ni hook: el wrapper solo traduce la
 * prop. Su firma difiere en dos detalles que este adaptador salva:
 *  - la prop se llama `opId`, no `orderId`;
 *  - es `number` no-nullable y usa `0` como "consulta apagada", en vez de `null`.
 * Por eso el mapeo es `opId={orderId ?? 0}`.
 *
 * Tampoco gestiona carga/error: el diálogo original ya resuelve `isLoading`/
 * `isError` con su propio spinner y estado de error.
 */
export function ProductionOrderDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: ProductionOrderDetailByIdDialogProps) {
  return (
    <ProductionOrderDetailDialog
      opId={orderId ?? 0}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
