"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { QuoteDetails } from "./QuoteDetails";
import type { QuoteDetailSource } from "../hooks/useQuote";

interface QuoteDetailByIdDialogProps {
  /** Id de la cotización a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Recurso por el que `QuoteDetails` pregunta primero. Se omite en el pedido
   * 360° y en la paleta global: ahí lo común es abrir cotizaciones de cualquier
   * estatus, que es justo lo que `/ventas/cotizaciones/` sirve —y cuando quien
   * mira es de mesa de control y no el vendedor, el respaldo por 404 de
   * `getQuoteDetailById` la recupera por `/ventas/mesa-control/`—. Las
   * notificaciones de `cotizacion_en_revision` pasan `"mesa-control"` porque
   * ahí el caso común es el inverso.
   */
  source?: QuoteDetailSource;
}

/**
 * Envoltorio de `QuoteDetails` para el registro `CLICKABLE_DOC_TIPOS` del detalle
 * de pedido. `QuoteDetails` NO es un diálogo: es el CONTENIDO que
 * `QuoteCardActions` mete dentro de un `MainDialog`, y ya es self-fetching por id
 * (`useQuote`) con sus propios estados de carga/error. Este wrapper solo aporta
 * el armazón `MainDialog` con la firma por id que el registro exige —sin action
 * ni hook nuevos, y sin loader propio (lo maneja `QuoteDetails`)—.
 *
 * Chrome replicado de `QuoteCardActions`: `DialogHeader` + `maxWidth="1000px"`.
 * A diferencia de `QuoteCardActions` —que tiene la fila y rotula el encabezado
 * con cliente/estatus del pedido— aquí solo se tiene el id, así que el título es
 * fijo ("Detalle de Cotización", sin colgarle un `#id` que se leería como folio
 * de pedido) y el `statusColor` queda en `sky`: el folio, cliente y estatus
 * reales los pinta `QuoteDetails` en el cuerpo al resolver su consulta.
 */
export function QuoteDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
  source,
}: QuoteDetailByIdDialogProps) {
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
      <QuoteDetails quoteId={orderId ?? 0} source={source} />
    </MainDialog>
  );
}
