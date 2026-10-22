"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormErrorBanner } from "@/src/components/FormErrorBanner";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { useSendInvoiceCfdi } from "../hooks/useSendInvoiceCfdi";
import {
  SendInvoiceCfdiFormFields,
  SendInvoiceCfdiFormSchema,
  type SendInvoiceCfdiFormValues,
} from "../schemas/invoice-cfdi-email.schema";
import type { SendInvoiceCfdiFailure } from "../utils/invoiceCfdiEmail";

/** Lo mínimo para enviar el CFDI, nombrar la factura y precargar el correo. */
export interface InvoiceCfdiEmailTarget {
  id: number;
  folio: string | null;
  correo_facturas: string | null;
}

interface InvoiceCfdiEmailDialogProps {
  invoice: InvoiceCfdiEmailTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo "Enviar CFDI" (`POST /finanzas/facturas/{id}/enviar-cfdi/`): manda
 * el PDF y el XML oficiales del CFDI al correo que el usuario confirme,
 * precargado con `correo_facturas` y editable.
 *
 * El envío puede tardar cerca de un minuto: el diálogo no se cierra a media
 * petición y el doble envío lo corta el candado por factura de
 * `useSendInvoiceCfdi`. Se cierra al terminar bien (incluido el caso en que el
 * precheck detuvo el envío, que el hook avisa); ante un error queda abierto
 * con el correo escrito y muestra el mensaje del backend tal cual.
 */
export function InvoiceCfdiEmailDialog({ invoice, open, onOpenChange }: InvoiceCfdiEmailDialogProps) {
  const session = useDialogSession(open, invoice);
  const target = session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";

  const { send, isSending } = useSendInvoiceCfdi(target?.id ?? 0);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && isSending) return;
    onOpenChange(next);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title="Enviar CFDI"
      description={`Se enviarán por correo el PDF y el XML oficiales del CFDI de la factura ${invoiceLabel}.`}
    >
      {target && (
        <InvoiceCfdiEmailForm
          key={session.id}
          target={target}
          isPending={isSending}
          onClose={() => handleOpenChange(false)}
          // Cierre directo, sin pasar por `handleOpenChange`: al terminar, el
          // `isSending` capturado en este render todavía no se actualizó.
          onSubmit={(email, callbacks) =>
            send(email, { onSuccess: () => onOpenChange(false), ...callbacks })
          }
        />
      )}
    </MainDialog>
  );
}

interface InvoiceCfdiEmailFormProps {
  /** La factura como estaba al abrir el diálogo. */
  target: InvoiceCfdiEmailTarget;
  isPending: boolean;
  onClose: () => void;
  /** `onError` recibe el fallo clasificado, para mostrarlo dentro del diálogo. */
  onSubmit: (email: string, callbacks: { onError: (failure: SendInvoiceCfdiFailure) => void }) => void;
}

type SendInvoiceCfdiFormField = keyof SendInvoiceCfdiFormValues;

/**
 * Contenido del diálogo; se monta nuevo en cada apertura (`key`), así que el
 * correo arranca desde el `correo_facturas` de esa apertura. Los errores del
 * campo —los del schema y el `email` del backend— van bajo el campo
 * (`useFormFieldErrors`); los demás fallos, en el banner.
 */
function InvoiceCfdiEmailForm({ target, isPending, onClose, onSubmit }: InvoiceCfdiEmailFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    replaceClientErrors,
    clearServerErrors,
  } = useFormFieldErrors<SendInvoiceCfdiFormField>();
  const emailId = `invoice-cfdi-email-${target.id}`;
  const emailHelpId = `${emailId}-help`;

  // Valida un solo campo en blur.
  const validateField = (field: SendInvoiceCfdiFormField, value: string) => {
    const parsed = SendInvoiceCfdiFormFields[field].safeParse(value);
    if (parsed.success) {
      clearClientFieldError(field);
      return;
    }
    setClientFieldError(field, parsed.error.issues[0]?.message ?? "Valor inválido");
  };

  const form = useForm({
    defaultValues: { email: target.correo_facturas ?? "" } satisfies SendInvoiceCfdiFormValues,
    // El doble envío lo corta el candado por factura de `useSendInvoiceCfdi`.
    onSubmit: ({ value }) => {
      clearServerErrors();
      const parsed = SendInvoiceCfdiFormSchema.safeParse(value);
      if (!parsed.success) {
        replaceClientErrors({ email: parsed.error.issues[0]?.message ?? "Correo inválido" });
        return;
      }
      replaceClientErrors({});
      setSubmitError(null);
      onSubmit(parsed.data.email, {
        onError: (failure) => {
          if (failure.emailError) setServerFieldError("email", failure.emailError);
          else setSubmitError(failure.message);
        },
      });
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-4 py-1">
      <form.Field name="email">
        {(field) => (
          <FormInput
            id={emailId}
            label="Correo de destino"
            aria-describedby={emailHelpId}
            name={field.name}
            type="email"
            autoComplete="email"
            placeholder="correo@cliente.com"
            value={field.state.value}
            disabled={isPending}
            error={getError("email")}
            onChange={(event) => {
              field.handleChange(event.target.value);
              clearFieldErrors("email");
            }}
            onBlur={() => {
              field.handleBlur();
              validateField("email", field.state.value);
            }}
          />
        )}
      </form.Field>
      <p id={emailHelpId} className="-mt-2 ml-1 text-xs text-slate-500 dark:text-slate-400">
        {target.correo_facturas
          ? "Precargado con el correo de facturación del pedido o del cliente. Una sola dirección."
          : "Ni el pedido ni el cliente tienen correo de facturación: escribe uno. Una sola dirección."}
      </p>
      <p className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
        Los archivos se descargan de Facturama al enviar: puede tardar hasta un minuto. No cierres
        esta ventana mientras se envía.
      </p>
      <FormErrorBanner message={submitError} />
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isPending} />
        <FormSubmitButton isPending={isPending} loadingLabel="Enviando CFDI…">
          Enviar CFDI
        </FormSubmitButton>
      </div>
    </form>
  );
}
