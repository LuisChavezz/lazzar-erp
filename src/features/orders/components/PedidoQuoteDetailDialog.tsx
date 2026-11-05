"use client";

import { QuoteDetailByIdDialog } from "@/src/features/quotes/components/QuoteDetailByIdDialog";

interface PedidoQuoteDetailDialogProps {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cotización de origen abierta desde el pedido 360°, con el respaldo
 * `"cotizaciones-o-mesa-control"` (el otro único uso de un respaldo es la
 * notificación `cotizacion_en_revision`). A esta vista llegan lectores de
 * Ventas, Mesa de Control, WMS, Compras y Producción, y el front no sabe cuál
 * de los dos alcances del backend le corresponde a cada uno. Se retira cuando
 * exista la lectura con el alcance del pedido (EC-787). Solo adapta la firma
 * del registro `ORDER_DOCUMENT_DIALOGS`.
 */
export function PedidoQuoteDetailDialog(props: PedidoQuoteDetailDialogProps) {
  return <QuoteDetailByIdDialog {...props} source="cotizaciones-o-mesa-control" />;
}
