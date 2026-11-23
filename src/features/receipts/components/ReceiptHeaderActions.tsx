"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { BanIcon } from "@/src/components/Icons";
import type { ReceiptDetail } from "../interfaces/receipt.interface";
import { ReceiptCancelDialog } from "./ReceiptCancelDialog";
import { ReceiptPdfButton } from "./ReceiptPdfButton";

/**
 * Acciones del encabezado de los diálogos de detalle de una recepción
 * (`ReceiptDetailDialog` en WMS/auditoría/SM y `PurchaseOrderReceiptDetailDialog`
 * en Compras): "Descargar PDF" (EC-856) y, solo si el backend dice
 * `puede_cancelar` (EC-925), "Cancelar". El front NO repite la regla (admin,
 * estatus, origen, calidad, OP, facturas): `puede_cancelar` ya la trae para el
 * usuario que consulta, y la acción la vuelve a validar.
 */
export function ReceiptHeaderActions({ receipt }: { receipt: ReceiptDetail }) {
  const [cancelOpen, setCancelOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {receipt.puede_cancelar === true && (
        <Button
          variant="secondary"
          onClick={() => setCancelOpen(true)}
          className="px-3! py-1.5! text-xs! text-rose-600! dark:text-rose-400!"
        >
          <BanIcon className="w-4 h-4" aria-hidden="true" />
          Cancelar
        </Button>
      )}
      <ReceiptPdfButton receipt={receipt} />
      {/* Montado aparte del botón: al cancelar, `puede_cancelar` pasa a false y
          el botón desaparece, pero el diálogo debe poder cerrarse animado. */}
      <ReceiptCancelDialog receipt={receipt} open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}
