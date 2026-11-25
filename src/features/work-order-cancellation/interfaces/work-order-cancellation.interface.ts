import type { DocumentCancellationFields } from "@/src/features/document-cancellation/interfaces/document-cancellation.interface";

/**
 * Respuesta de `POST orden-bordado|orden-reflejante|orden-corte-manga/{id}/cancelar/`
 * (nucleo-erp#1355, EC-966). No es el detalle: solo el id, el folio, el
 * estatus nuevo (bordado `8`, reflejante y corte `7`) y los datos de la
 * cancelación. `estatus` viaja con ese nombre, no con el del campo de la orden.
 */
export interface WorkOrderCancelResponse extends DocumentCancellationFields {
  id: number;
  folio: string | null;
  estatus: number;
}
