"use client";

import {
  QuoteDetailsLoadError,
  QuoteDetailsSkeleton,
  QuoteDetailsView,
} from "@/src/features/quotes/components/QuoteDetails";
import { QuoteDetailDialogShell } from "@/src/features/quotes/components/QuoteDetailDialogShell";
import { useQuoteComentarios } from "@/src/features/quotes/hooks/useQuoteComentarios";
import { usePedidoQuote } from "../hooks/usePedidoQuote";

interface PedidoQuoteDetailDialogProps {
  /** Id de la COTIZACIÓN (`doc.id` de `documentos[]`). */
  orderId: number | null;
  /** Id del pedido 360° que la abre: el endpoint se lee por pedido. */
  pedidoId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NoQuoteState = () => (
  <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
    Este pedido no tiene una cotización disponible.
  </div>
);

/**
 * Contenido: la cotización del pedido leída por
 * `/ventas/pedidos/{id}/cotizacion/` (EC-787/EC-792), con el alcance del pedido.
 *
 * - 404, o sin id de cotización → estado vacío, no error.
 * - Importes y datos de pago: los oculta `QuoteDetailsView` cuando la
 *   respuesta no los trae (quien no tiene visibilidad contable).
 * - Historial: se lee de `/ventas/cotizaciones/{id}/comentarios/` SOLO cuando
 *   el detalle ya llegó, y la sección no se monta hasta que esa lectura
 *   resuelve: con éxito se pinta; con 404 (su alcance es el de ventas, no el
 *   del pedido) se omite sin aviso ni parpadeo; cualquier otro fallo se
 *   muestra en la sección, como siempre.
 */
function PedidoQuoteDetailContent({
  cotizacionId,
  pedidoId,
}: {
  cotizacionId: number | null;
  pedidoId: number;
}) {
  const quoteQuery = usePedidoQuote(cotizacionId, pedidoId);
  const comentariosQuery = useQuoteComentarios(
    cotizacionId ?? 0,
    quoteQuery.data ? "cotizaciones" : undefined,
  );

  if (cotizacionId === null || cotizacionId <= 0) return <NoQuoteState />;

  if (quoteQuery.isLoading) return <QuoteDetailsSkeleton />;

  if (quoteQuery.isDefinitiveError) return <NoQuoteState />;

  if (!quoteQuery.data) return <QuoteDetailsLoadError />;

  const showComentarios =
    comentariosQuery.data !== undefined ||
    (comentariosQuery.isInitialError && !comentariosQuery.isDefinitiveError);

  return (
    <QuoteDetailsView
      quote={quoteQuery.data}
      comentarios={showComentarios ? comentariosQuery : null}
    />
  );
}

/**
 * Cotización de origen abierta desde el pedido 360°, en el armazón común
 * `QuoteDetailDialogShell`. Lee por el pedido en vez de por `/cotizaciones/`
 * con respaldo a `/mesa-control/`: a esta vista llegan Ventas, Mesa de
 * Control, WMS, Compras y Producción.
 */
export function PedidoQuoteDetailDialog({
  orderId,
  pedidoId,
  open,
  onOpenChange,
}: PedidoQuoteDetailDialogProps) {
  return (
    <QuoteDetailDialogShell open={open} onOpenChange={onOpenChange}>
      <PedidoQuoteDetailContent cotizacionId={orderId} pedidoId={pedidoId} />
    </QuoteDetailDialogShell>
  );
}
