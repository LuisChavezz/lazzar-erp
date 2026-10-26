"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormErrorBanner } from "@/src/components/FormErrorBanner";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { useEmitInvoice } from "../hooks/useEmitInvoice";
import { EmitInvoiceFormSchema } from "../schemas/invoice-emit.schema";
import { LOCAL_CURRENCY } from "@/src/utils/tipoCambio";
import {
  formatInvoiceTipoCambio,
  invoiceCurrencyCode,
  requiresInvoiceTipoCambio,
  tipoCambioInputValue,
} from "../utils/invoiceCurrency";
import {
  invoiceStampedWithoutTipoCambioMessage,
  isInvoiceTipoCambioLockedByCfdi,
} from "../utils/invoiceEmission";

/**
 * Lo mínimo para emitir y nombrar la factura y saber si pide tipo de cambio, o
 * si ya lo fija su CFDI (el retrieve).
 */
export interface InvoiceEmitTarget {
  id: number;
  folio: string | null;
  moneda_nombre: string | null;
  tipo_cambio: string | null;
  cfdi_uuid: string | null;
}

interface InvoiceEmitDialogProps {
  invoice: InvoiceEmitTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de EMISIÓN de una factura `Borrador`
 * (`POST /finanzas/facturas/{id}/emitir/`). Fuera de MXN pide además el tipo
 * de cambio, que se guarda con un PATCH justo antes de emitir
 * (`useEmitInvoice`); en MXN solo confirma y no manda tipo de cambio. Si la
 * factura ya está timbrada, su tipo de cambio es el del CFDI: se muestra de
 * solo lectura y no se manda.
 *
 * Lo monta el dueño de la vista (`InvoiceMainSheet`, vía
 * `DocumentActionWithDialog`), no el botón: al emitir, el refetch retira la
 * acción y el diálogo debe seguir montado hasta cerrarse.
 *
 * El doble envío lo corta el candado por factura de `useEmitInvoice`. Solo se
 * cierra cuando la petición termina bien (incluido "ya no estaba en
 * Borrador", que el hook avisa); ante un error queda abierto con lo capturado
 * y muestra el mensaje del backend: el del tipo de cambio bajo su campo, el
 * resto en el banner (además del toast).
 */
export function InvoiceEmitDialog({ invoice, open, onOpenChange }: InvoiceEmitDialogProps) {
  const session = useDialogSession(open, invoice);
  const target = session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";

  const { emit, isEmitting } = useEmitInvoice(target?.id ?? 0);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && isEmitting) return;
    onOpenChange(next);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title="Emitir factura"
      description={`La factura ${invoiceLabel} pasará a Emitida con fecha de hoy y se generarán su cuenta por cobrar por el total y su póliza contable. No podrá regresar a Borrador.`}
    >
      {target && (
        <InvoiceEmitForm
          key={session.id}
          target={target}
          isPending={isEmitting}
          onClose={() => handleOpenChange(false)}
          // Cierre directo, sin pasar por `handleOpenChange`: al terminar, el
          // `isEmitting` capturado en este render todavía no se actualizó.
          onSubmit={(tipoCambio, callbacks) =>
            emit({ tipoCambio }, { onSuccess: () => onOpenChange(false), ...callbacks })
          }
        />
      )}
    </MainDialog>
  );
}

interface InvoiceEmitFormProps {
  /** La factura como estaba al abrir el diálogo. */
  target: InvoiceEmitTarget;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (
    tipoCambio: string | null,
    callbacks: { onFieldError: (message: string) => void; onError: (message: string) => void },
  ) => void;
}

/**
 * Contenido del diálogo; se monta nuevo en cada apertura (`key`), así que el
 * tipo de cambio arranca con el que el `Borrador` ya tuviera guardado.
 */
function InvoiceEmitForm({ target, isPending, onClose, onSubmit }: InvoiceEmitFormProps) {
  const moneda = invoiceCurrencyCode(target);
  const lockedByCfdi = isInvoiceTipoCambioLockedByCfdi(target);
  const needsTipoCambio = requiresInvoiceTipoCambio(target) && !lockedByCfdi;
  const [tipoCambio, setTipoCambio] = useState(() => tipoCambioInputValue(target.tipo_cambio));
  const [tipoCambioError, setTipoCambioError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const tipoCambioId = `invoice-emit-tipo-cambio-${target.id}`;
  const tipoCambioHelpId = `${tipoCambioId}-help`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Con el tipo de cambio fijado por el CFDI no se valida ni se manda nada.
    const parsed = EmitInvoiceFormSchema.safeParse({
      moneda: lockedByCfdi ? LOCAL_CURRENCY : moneda,
      tipo_cambio: tipoCambio,
    });
    if (!parsed.success) {
      setTipoCambioError(parsed.error.issues[0]?.message ?? "Tipo de cambio inválido");
      return;
    }
    setSubmitError(null);
    onSubmit(parsed.data.tipo_cambio, {
      onFieldError: setTipoCambioError,
      onError: setSubmitError,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 py-1">
      {lockedByCfdi && (
        <p className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {target.tipo_cambio === null
            ? invoiceStampedWithoutTipoCambioMessage(moneda)
            : `La factura ya está timbrada: se emitirá con el tipo de cambio de su CFDI, ${formatInvoiceTipoCambio(target.tipo_cambio)} MXN por ${moneda || "unidad"}, que no puede cambiarse.`}
        </p>
      )}
      {needsTipoCambio && (
        <div>
          <FormInput
            id={tipoCambioId}
            label={`Tipo de cambio (MXN por ${moneda || "unidad"})`}
            aria-describedby={tipoCambioHelpId}
            inputMode="decimal"
            placeholder="0.000000"
            name="tipo_cambio"
            autoComplete="off"
            value={tipoCambio}
            disabled={isPending}
            error={tipoCambioError ? { message: tipoCambioError } : undefined}
            onChange={(event) => {
              setTipoCambio(sanitizeDecimalInput(event.target.value, 6));
              if (tipoCambioError) setTipoCambioError(null);
            }}
          />
          <p id={tipoCambioHelpId} className="mt-1 ml-1 text-xs text-slate-500 dark:text-slate-400">
            Pesos por cada {moneda || "unidad"}. Con él se registran la póliza en pesos y el CFDI;
            ya no podrá cambiarse después de emitir.
          </p>
        </div>
      )}
      <FormErrorBanner message={submitError} />
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isPending} />
        <FormSubmitButton isPending={isPending} loadingLabel="Emitiendo…">
          Emitir factura
        </FormSubmitButton>
      </div>
    </form>
  );
}
