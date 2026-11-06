"use client";

import { QuoteDetailDialogShell } from "./QuoteDetailDialogShell";
import { QuoteDetails } from "./QuoteDetails";
import type { QuoteDetailSource } from "../hooks/useQuote";

interface QuoteDetailByIdDialogProps {
  /** Id de la cotización a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Recurso por el que `QuoteDetails` lee el detalle y sus comentarios.
   * Obligatorio: el buscador global pasa `"cotizaciones"` (sus resultados
   * salen de ese mismo alcance), las notificaciones lo eligen por `tipo` (y
   * por rol en `cotizacion_en_revision`). El pedido 360° ya no lo usa: lee
   * por el pedido (`PedidoQuoteDetailDialog`, EC-792).
   */
  source: QuoteDetailSource;
  /**
   * Opcional, se pasa tal cual a `MainDialog`: corre cuando el diálogo YA se
   * desmontó (terminada la animación de salida). Sirve para soltar el id justo
   * ahí; soltarlo antes apaga la consulta y el contenido cae a su estado de
   * error mientras aún se ve. Sin ella el diálogo se comporta como siempre.
   */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Detalle de una cotización abierta por id desde el buscador global y las
 * notificaciones: `QuoteDetails` (self-fetching por id con `useQuote`, con sus
 * propios estados de carga/error) dentro del armazón común
 * `QuoteDetailDialogShell`. No está en el registro de documentos del pedido:
 * el 360° usa `PedidoQuoteDetailDialog`, que lee por el pedido.
 */
export function QuoteDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
  source,
  onCloseAutoFocus,
}: QuoteDetailByIdDialogProps) {
  return (
    <QuoteDetailDialogShell
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <QuoteDetails quoteId={orderId ?? 0} source={source} />
    </QuoteDetailDialogShell>
  );
}
