"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCancelInvoice } from "../hooks/useCancelInvoice";
import { getInvoiceCancelCfdiNotice } from "../utils/invoiceCancellation";
import {
  CancelInvoiceFormSchema,
  INVOICE_CANCEL_MOTIVO_MAX_LENGTH,
} from "../schemas/invoice-cancel.schema";

/**
 * Lo mínimo para cancelar y nombrar la factura y avisar de su CFDI; sirve
 * tanto la fila del listado como el retrieve. `cfdi_cancelado` solo viene en
 * el retrieve: sin él, una timbrada muestra el aviso de "primero el SAT".
 */
export interface InvoiceCancelTarget {
  id: number;
  folio: string | null;
  cfdi_uuid: string | null;
  cfdi_cancelado?: boolean;
}

interface InvoiceCancelDialogProps {
  invoice: InvoiceCancelTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de CANCELACIÓN de una factura
 * (`POST /finanzas/facturas/{id}/cancelar/`), con motivo opcional.
 *
 * Lo monta el dueño de la vista (`InvoiceList`, `InvoiceMainSheet`), NO la
 * celda de la fila: al cancelar, el refetch puede sacar la fila de un listado
 * filtrado por estatus y la celda —con su diálogo— se desmontaría a media
 * operación.
 *
 * El doble envío lo corta el candado por factura de `useCancelInvoice` (la
 * mutación misma). Solo se cierra cuando la petición termina bien —incluido
 * el caso "ya estaba cancelada", que el hook avisa—; ante un error queda
 * abierto con la nota escrita para reintentar y muestra el mensaje del
 * backend tal cual (además del toast).
 *
 * En una factura timbrada avisa que `cancelar/` cancela primero el CFDI ante
 * el SAT (motivo 02, fijo) o, si el SAT ya lo canceló, que solo falta la parte
 * del ERP (`getInvoiceCancelCfdiNotice`). La nota interna NO va al SAT: el
 * backend solo la agrega a `observaciones`.
 *
 * El texto NO promete que las piezas regresen a existencia: el backend solo
 * las reintegra al cancelar una `Emitida` con renglones, y la respuesta no
 * trae ningún dato de inventario. Lo que sí ocurre siempre es que la factura
 * deja de contar en el avance del pedido y sus piezas vuelven a quedar
 * pendientes por facturar.
 */
export function InvoiceCancelDialog({ invoice, open, onOpenChange }: InvoiceCancelDialogProps) {
  const session = useDialogSession(open, invoice);
  const target = session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";
  const cfdiNotice = target ? getInvoiceCancelCfdiNotice(target) : null;

  const { cancel, isCancelling } = useCancelInvoice(target?.id ?? 0);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && isCancelling) return;
    onOpenChange(next);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title="Cancelar factura"
      description={`La factura ${invoiceLabel} quedará como Cancelada y sus piezas volverán a quedar pendientes por facturar en el pedido. Esta acción no se puede deshacer.`}
    >
      {target && (
        <InvoiceCancelForm
          key={session.id}
          invoiceId={target.id}
          cfdiNotice={cfdiNotice}
          isPending={isCancelling}
          onClose={() => handleOpenChange(false)}
          // Cierre directo, sin pasar por `handleOpenChange`: al terminar, el
          // `isCancelling` capturado en este render todavía no se actualizó.
          onSubmit={(motivo, onError) =>
            cancel(motivo, { onSuccess: () => onOpenChange(false), onError })
          }
        />
      )}
    </MainDialog>
  );
}

interface InvoiceCancelFormProps {
  invoiceId: number;
  /** Aviso sobre el CFDI (`getInvoiceCancelCfdiNotice`), o `null` sin CFDI. */
  cfdiNotice: string | null;
  isPending: boolean;
  onClose: () => void;
  /** `onError` recibe el mensaje del fallo para mostrarlo dentro del diálogo. */
  onSubmit: (motivo: string | undefined, onError: (message: string) => void) => void;
}

/**
 * Contenido del diálogo; se monta nuevo en cada apertura (`key`), así que la
 * nota y el error arrancan vacíos. El campo sigue llamándose `motivo` porque
 * es el nombre del backend.
 */
function InvoiceCancelForm({ invoiceId, cfdiNotice, isPending, onClose, onSubmit }: InvoiceCancelFormProps) {
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const motivoId = `invoice-cancel-motivo-${invoiceId}`;
  const motivoHelpId = `${motivoId}-help`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = CancelInvoiceFormSchema.safeParse({ motivo });
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }
    setSubmitError(null);
    onSubmit(parsed.data.motivo || undefined, setSubmitError);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      {cfdiNotice && (
        <p className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {cfdiNotice}
        </p>
      )}
      <FormTextarea
        id={motivoId}
        label="Nota interna (opcional)"
        aria-describedby={motivoHelpId}
        name="motivo"
        rows={3}
        placeholder="Explica por qué se cancela la factura"
        value={motivo}
        maxLength={INVOICE_CANCEL_MOTIVO_MAX_LENGTH}
        forceUppercase
        disabled={isPending}
        error={motivoError ? { message: motivoError } : undefined}
        onChange={(event) => {
          setMotivo(event.target.value);
          if (motivoError) setMotivoError(null);
        }}
      />
      <p id={motivoHelpId} className="-mt-2 ml-1 text-xs text-slate-500 dark:text-slate-400">
        Se guarda en las observaciones de la factura; no se envía al SAT.
      </p>
      {submitError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {submitError}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Cancelando…"
          className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
        >
          Cancelar factura
        </FormSubmitButton>
      </div>
    </form>
  );
}
