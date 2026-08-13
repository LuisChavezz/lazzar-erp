"use client";

import { StockMovementDetailDialog } from "./StockMovementDetailDialog";

interface StockMovementDetailByIdDialogProps {
  /** Id del movimiento a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Adaptador de firma de `StockMovementDetailDialog` a la que exige el registro
 * `CLICKABLE_DOC_TIPOS` del detalle de pedido (`{ orderId, open, onOpenChange }`).
 *
 * `StockMovementDetailDialog` YA es self-fetching por id y maneja loading/error
 * internamente, así que —igual que producción— aquí no hace falta action ni hook:
 * el wrapper solo traduce la prop. Su firma difiere en dos detalles que este
 * adaptador salva:
 *  - la prop se llama `movementId`, no `orderId`;
 *  - es `number` no-nullable y usa `0` como "consulta apagada", en vez de `null`.
 * Por eso el mapeo es `movementId={orderId ?? 0}`.
 */
export function StockMovementDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: StockMovementDetailByIdDialogProps) {
  return (
    <StockMovementDetailDialog
      movementId={orderId ?? 0}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
