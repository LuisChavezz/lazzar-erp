"use client";

import type React from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";

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
 * `statusColor` `sky` y `maxWidth="1000px"`, replicados de
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
      maxWidth="1000px"
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
