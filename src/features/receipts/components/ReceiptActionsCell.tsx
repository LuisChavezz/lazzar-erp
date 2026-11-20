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

// ── Celda de acciones de la vista Compras ───────────────────────────────────
// La usa `PurchaseOrderReceiptColumns`: cada fila monta su propio
// `DetailDialog` (consulta deshabilitada, receiptId = null, mientras está
// cerrado). La vista WMS ya centraliza un solo diálogo en `ReceiptView`
// (`getReceiptColumns({ onViewDetail })`); Compras puede migrar igual.
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
