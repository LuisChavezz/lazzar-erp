"use client";

import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { cancelReceiptMutationKey, useCancelReceipt } from "../hooks/useCancelReceipt";
import {
  CancelReceiptFormSchema,
  RECEIPT_CANCEL_MOTIVO_MAX,
  type CancelReceiptFormValues,
} from "../schemas/receipt-cancel.schema";
import {
  classifyReceiptCancelError,
  receiptCancelErrorClosesDialog,
} from "../utils/receiptCancelErrors";
import type { ReceiptDetail } from "../interfaces/receipt.interface";

type CancelReceiptFormField = keyof CancelReceiptFormValues;

const EMPTY_VALUES: CancelReceiptFormValues = { motivo: "" };

type ReceiptToCancel = Pick<ReceiptDetail, "id" | "folio">;

interface ReceiptCancelDialogProps {
  receipt: ReceiptToCancel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Cancelar recepción" con motivo obligatorio (EC-925,
 * `POST /compras/recepciones/{id}/cancelar/`). Mismo patrón que
 * `PurchaseOrderCancelDialog`: TanStack Form con el schema Zod,
 * `useFormFieldErrors` para los errores de `motivo` (del schema y del backend)
 * y botones que evitan la palabra "Cancelar" sola.
 *
 * Quien lo monta decide si se ofrece, SOLO con `puede_cancelar` del retrieve.
 * Errores: `motivo` bajo el campo; si la recepción ya no se puede cancelar
 * (400 `estatus`/`op`/`facturas_proveedores` o 404) se cierra y el toast trae
 * el motivo; 403, red o 5xx dejan el diálogo abierto con el motivo escrito.
 */
export function ReceiptCancelDialog({ receipt, open, onOpenChange }: ReceiptCancelDialogProps) {
  // La recepción tal como estaba al abrir: el detalle se relee al cancelar y el
  // texto no debe cambiar mientras el diálogo se cierra.
  const session = useDialogSession(open, receipt);
  // Candado de la mutación (por recepción): mientras corre, ni Esc ni el
  // overlay cierran el diálogo; el resultado debe verse.
  const { isRunning } = useMutationLock(cancelReceiptMutationKey(session.snapshot.id));
  const handleOpenChange = (next: boolean) => {
    if (!next && isRunning) return;
    onOpenChange(next);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title="Cancelar Recepción"
      description={`La recepción ${session.snapshot.folio || `#${session.snapshot.id}`} quedará registrada como cancelada y lo recibido volverá a quedar pendiente en su orden. Esta acción no se puede deshacer.`}
    >
      <ReceiptCancelForm key={session.id} receipt={session.snapshot} onOpenChange={onOpenChange} />
    </MainDialog>
  );
}

function ReceiptCancelForm({
  receipt,
  onOpenChange,
}: {
  receipt: ReceiptToCancel;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    clearServerErrors,
  } = useFormFieldErrors<CancelReceiptFormField>();

  const { mutate, isPending } = useCancelReceipt(receipt.id, {
    onMotivoError: (message) => setServerFieldError("motivo", message),
  });
  // Doble envío: `isPending` llega un render tarde (dos clics en el mismo tick
  // lo leen en `false`); `isIdle()` consulta la caché de mutaciones al instante.
  const { isIdle } = useMutationLock(cancelReceiptMutationKey(receipt.id));

  const close = () => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (isPending) return;
    onOpenChange(false);
  };

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    onSubmit: ({ value }) => {
      if (!isIdle()) return;
      clearServerErrors();

      const parsed = CancelReceiptFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        return;
      }
      clearClientFieldError("motivo");

      mutate(parsed.data.motivo, {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          if (receiptCancelErrorClosesDialog(classifyReceiptCancelError(error))) onOpenChange(false);
        },
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-1">
      <form.Field name="motivo">
        {(field) => (
          <FormTextarea
            label="Motivo de cancelación"
            name={field.name}
            rows={3}
            placeholder="Explica por qué se cancela la recepción"
            value={field.state.value}
            disabled={isPending}
            error={getError("motivo")}
            onChange={(event) => {
              field.handleChange(event.target.value);
              clearFieldErrors("motivo");
            }}
            // Se valida al enviar, no en blur (ver `PurchaseOrderCancelDialog`).
            onBlur={field.handleBlur}
            aria-describedby="receipt-cancel-motivo-max"
          />
        )}
      </form.Field>
      <p id="receipt-cancel-motivo-max" className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
        Máximo {RECEIPT_CANCEL_MOTIVO_MAX} caracteres.
      </p>
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={close} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Cancelando…"
          className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
        >
          Cancelar recepción
        </FormSubmitButton>
      </div>
    </form>
  );
}
