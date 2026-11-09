"use client";

import type React from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { DIALOG_WIDTH_DETAIL } from "@/src/constants/dialogWidths";

interface QuoteDetailDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se pasa tal cual a `MainDialog` (ver `QuoteDetailByIdDialog`). */
  onCloseAutoFocus?: (event: Event) => void;
  children: React.ReactNode;
}

/**
 * Armazón común del detalle de cotización abierto por id: título fijo
 * ("Detalle de Cotización", sin `#id` que se leería como folio de pedido),
 * `statusColor` `sky` y el ancho de detalle (`DIALOG_WIDTH_DETAIL`), replicados de
 * `QuoteRowActionDialogs`. Lo usan `QuoteDetailByIdDialog` (buscador global,
 * notificaciones) y `PedidoQuoteDetailDialog` (pedido 360°); cada uno pone su
 * contenido.
 */
export function QuoteDetailDialogShell({
  open,
  onOpenChange,
  onCloseAutoFocus,
  children,
}: QuoteDetailDialogShellProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      maxWidth={DIALOG_WIDTH_DETAIL}
      title={
        <DialogHeader
          title="Detalle de Cotización"
          subtitle="Información completa de la cotización"
          statusColor="sky"
        />
      }
    >
      {children}
    </MainDialog>
  );
}
