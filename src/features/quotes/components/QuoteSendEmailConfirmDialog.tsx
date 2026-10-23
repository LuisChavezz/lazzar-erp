"use client";

/**
 * Confirmación de "Enviar correo" de una cotización (EC-563, ME-07).
 *
 * Muestra lo que se va a enviar —destinatarios, asunto y adjunto— a partir del
 * correo ya preparado (`usePrepareQuoteEmail`), y solo al confirmar se genera
 * el PDF y se envía. Sin destinatario lo dice y no deja enviar; cancelar no
 * envía nada.
 *
 * `MainDialog` y no `ConfirmDialog`: este último solo admite una descripción de
 * texto y no puede deshabilitar Confirmar, y aquí hacen falta las dos cosas.
 */
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { PreparedQuoteEmail } from "../../google/hooks/useGoogleSendEmail";

interface QuoteSendEmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: PreparedQuoteEmail;
  onConfirm: () => void;
}

/** `correo_facturas` puede traer varias direcciones separadas por coma o punto y coma. */
const splitRecipients = (to: string) =>
  to
    .split(/[,;]/)
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

export function QuoteSendEmailConfirmDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
}: QuoteSendEmailConfirmDialogProps) {
  const recipients = email.content ? splitRecipients(email.content.to) : [];
  const hasRecipients = recipients.length > 0;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="520px"
      title={
        <DialogHeader
          title={`Enviar cotización #${email.id}`}
          subtitle="Revisa el correo antes de enviarlo"
          statusColor="sky"
        />
      }
      actionButton={
        <Button
          variant="primary"
          disabled={!hasRecipients}
          onClick={() => {
            onOpenChange(false);
            onConfirm();
          }}
        >
          Enviar
        </Button>
      }
      actionButtonClose={false}
    >
      <dl className="mt-2 space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {recipients.length > 1 ? "Destinatarios" : "Destinatario"}
          </dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
            {hasRecipients ? (
              <ul className="space-y-0.5">
                {recipients.map((address) => (
                  <li key={address} className="break-all">
                    {address}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-rose-600 dark:text-rose-400">
                El cliente no tiene correo de facturación registrado, así que no hay a quién
                enviar la cotización.
              </p>
            )}
          </dd>
        </div>
        {email.content && (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Asunto
            </dt>
            <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{email.content.subject}</dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Adjunto
          </dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{email.attachmentName}</dd>
        </div>
      </dl>
    </MainDialog>
  );
}
