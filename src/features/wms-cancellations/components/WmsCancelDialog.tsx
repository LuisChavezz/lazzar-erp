"use client";

import { CancelReasonDialog } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { toCancelAction, type WmsCancelAction } from "../hooks/useWmsCancelMutation";

/** Lo que el diálogo dice y hace: fijo desde que se abre. */
export interface WmsCancelDialogContent<TResult> {
  action: WmsCancelAction<TResult>;
  /** "Cancelar envío", "Revertir traspaso"… */
  title: string;
  /** Qué pasará, con el folio del documento. */
  description: string;
  /** Texto del botón: nunca "Cancelar" solo (se confunde con cerrar). */
  submitLabel: string;
  pendingLabel: string;
  motivoPlaceholder: string;
  /**
   * Tras el éxito, con la respuesta: para un detalle que muestra una fila que
   * puede salir de su listado (p. ej. el envío bajo `?estado=ACTIVO`).
   */
  onSuccess?: (result: TResult) => void;
}

interface WmsCancelDialogProps<TResult> {
  content: WmsCancelDialogContent<TResult>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo único de las cancelaciones de WMS y de la reversa de una TR (EC-945),
 * con motivo obligatorio de a lo más 500 caracteres: `CancelReasonDialog`
 * (EC-948) con la acción de WMS (`toCancelAction`).
 *
 * Quien lo monta decide si se ofrece (`useCanCancelWmsDocuments` y el estado del
 * documento). Errores (`classifyWmsCancelError`): `motivo` bajo el campo; las
 * reglas de negocio (orden de cancelación, cadena de TR, inventario
 * insuficiente) y el `404` cierran con un toast que trae el mensaje del backend
 * tal cual; `403`, red o 5xx dejan el diálogo abierto con el motivo escrito.
 */
export function WmsCancelDialog<TResult>({ content, open, onOpenChange }: WmsCancelDialogProps<TResult>) {
  return (
    <CancelReasonDialog
      content={{ ...content, action: toCancelAction(content.action) }}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
