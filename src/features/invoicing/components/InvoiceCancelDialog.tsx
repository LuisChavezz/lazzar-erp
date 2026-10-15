"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCancelInvoice } from "../hooks/useCancelInvoice";
import {
  CancelInvoiceFormSchema,
  INVOICE_CANCEL_MOTIVO_MAX_LENGTH,
} from "../schemas/invoice-cancel.schema";

/** Lo mínimo para cancelar y nombrar la factura; sirve tanto la fila del listado como el retrieve. */
export interface InvoiceCancelTarget {
  id: number;
  folio: string | null;
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
 * abierto con el motivo escrito para reintentar.
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
          isPending={isCancelling}
          onClose={() => handleOpenChange(false)}
          // Cierre directo, sin pasar por `handleOpenChange`: al terminar, el
          // `isCancelling` capturado en este render todavía no se actualizó.
          onSubmit={(motivo) => cancel(motivo, { onSuccess: () => onOpenChange(false) })}
        />
      )}
    </MainDialog>
  );
}

interface InvoiceCancelFormProps {
  invoiceId: number;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (motivo: string | undefined) => void;
}

/** Contenido del diálogo; se monta nuevo en cada apertura (`key`), así que el motivo arranca vacío. */
function InvoiceCancelForm({ invoiceId, isPending, onClose, onSubmit }: InvoiceCancelFormProps) {
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = CancelInvoiceFormSchema.safeParse({ motivo });
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }
    onSubmit(parsed.data.motivo || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <FormTextarea
        id={`invoice-cancel-motivo-${invoiceId}`}
        label="Motivo (opcional)"
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
