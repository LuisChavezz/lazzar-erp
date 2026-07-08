"use client";

import { useState, type ComponentType } from "react";
import type { Receipt } from "../interfaces/receipt.interface";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";

interface ReceiptDetailDialogLikeProps {
  receiptId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReceiptActionsCellProps {
  row: Receipt;
  /** Diálogo de detalle a montar — cada consumidor decide el suyo (WMS vs. Compras). */
  DetailDialog: ComponentType<ReceiptDetailDialogLikeProps>;
}

// ── Celda de acciones compartida ────────────────────────────────────────────
// Reutilizada por la vista WMS (ReceiptColumns) y la vista Compras
// (PurchaseOrderReceiptColumns): mismo estado de apertura por fila y mismo
// menú; cada consumidor solo decide qué `*DetailDialog` renderizar mediante
// `DetailDialog`. La consulta del detalle queda deshabilitada
// (receiptId = null) mientras el diálogo esté cerrado.
//
// Nota: cada fila monta su propio `DetailDialog` (y por lo tanto su propio
// `useReceiptDetail` deshabilitado) aunque solo uno pueda estar abierto a la
// vez. Centralizar esto en un único diálogo a nivel de tabla requeriría que
// `receiptColumns`/`purchaseOrderReceiptColumns` dejen de ser arreglos
// estáticos y pasen a ser fábricas que reciban un callback `onView`, tocando
// también `ReceiptView`/`PurchaseOrderReceiptList` — un cambio más disruptivo
// que el alcance de esta limpieza. Se deja documentado para una pasada futura.
export const ReceiptActionsCell = ({ row, DetailDialog }: ReceiptActionsCellProps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => setIsDetailOpen(true),
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu
        items={menuItems}
        ariaLabel={`Acciones de la recepción ${row.folio}`}
      />
      <DetailDialog
        receiptId={isDetailOpen ? row.id : null}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
};
