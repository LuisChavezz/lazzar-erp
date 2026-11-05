"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import {
  QuoteDetailsLoadError,
  QuoteDetailsSkeleton,
  QuoteDetailsView,
} from "@/src/features/quotes/components/QuoteDetails";
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

/**
 * Contenido: la cotización del pedido leída por
 * `/ventas/pedidos/{id}/cotizacion/` (EC-787/EC-792), con el alcance del pedido.
 *
 * - 404 (pedido sin cotización o no visible) → estado vacío, no error.
 * - Importes y datos de pago: los oculta `QuoteDetailsView` cuando la
 *   respuesta no los trae (quien no tiene visibilidad contable).
 * - Historial: se intenta `/ventas/cotizaciones/{id}/comentarios/`; si responde
 *   404 (su alcance es el de ventas, no el del pedido) la sección se omite sin
 *   aviso. Cualquier otro fallo se muestra en la sección, como siempre.
 */
function PedidoQuoteDetailContent({
  cotizacionId,
  pedidoId,
}: {
  cotizacionId: number | null;
  pedidoId: number;
}) {
  const quoteQuery = usePedidoQuote(cotizacionId, pedidoId);
  // Arranca en paralelo con el detalle; se apaga si el detalle ya dio 404.
  const comentariosQuery = useQuoteComentarios(
    cotizacionId ?? 0,
    quoteQuery.isDefinitiveError ? undefined : "cotizaciones",
  );

  if (quoteQuery.isLoading) return <QuoteDetailsSkeleton />;

  if (quoteQuery.isDefinitiveError) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Este pedido no tiene una cotización disponible.
      </div>
    );
  }

  if (!quoteQuery.data) return <QuoteDetailsLoadError />;

  return (
    <QuoteDetailsView
      quote={quoteQuery.data}
      comentarios={comentariosQuery.isDefinitiveError ? null : comentariosQuery}
    />
  );
}

/**
 * Cotización de origen abierta desde el pedido 360°. Mismo armazón que
 * `QuoteDetailByIdDialog` (`DialogHeader` + `maxWidth="1000px"`), pero lee por
 * el pedido en vez de por `/cotizaciones/` con respaldo a `/mesa-control/`:
 * a esta vista llegan Ventas, Mesa de Control, WMS, Compras y Producción.
 */
export function PedidoQuoteDetailDialog({
  orderId,
  pedidoId,
  open,
  onOpenChange,
}: PedidoQuoteDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="1000px"
      title={
        <DialogHeader
          title="Detalle de Cotización"
          subtitle="Información completa de la cotización"
          statusColor="sky"
        />
      }
    >
      <PedidoQuoteDetailContent cotizacionId={orderId} pedidoId={pedidoId} />
    </MainDialog>
  );
}
