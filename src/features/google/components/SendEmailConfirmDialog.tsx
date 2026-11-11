"use client";

/**
 * Confirmación de un correo con PDF adjunto ANTES de enviarlo (EC-563, ME-07):
 * muestra lo que se va a enviar —destinatarios, asunto y adjunto— a partir del
 * correo ya preparado, y solo al confirmar se genera el PDF y se envía. Sin
 * destinatario lo dice (`noRecipientMessage`) y no deja enviar; cancelar no
 * envía nada.
 *
 * Lo comparten cotizaciones (`QuoteSendEmailConfirmDialog`) y facturas
 * (`InvoiceSendEmailConfirmDialog`), que solo ponen su título y su texto.
 *
 * `MainDialog` y no `ConfirmDialog`: este último solo admite una descripción de
 * texto y no puede deshabilitar Confirmar, y aquí hacen falta las dos cosas.
 */
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { DialogHeader } from "@/src/components/DialogHeader";

interface SendEmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** La misma lista que se envía; vacía si no hay a quién enviarlo. */
  recipients: string[];
  /** `undefined` cuando no hay correo que enviar (sin destinatarios). */
  subject?: string;
  attachmentName: string;
  noRecipientMessage: string;
  onConfirm: () => void;
  /** Deshabilita "Enviar" (p. ej. mientras se cargan datos del adjunto). */
  confirmDisabled?: boolean;
}

export function SendEmailConfirmDialog({
  open,
  onOpenChange,
  title,
  recipients,
  subject,
  attachmentName,
  noRecipientMessage,
  onConfirm,
  confirmDisabled = false,
}: SendEmailConfirmDialogProps) {
  const hasRecipients = recipients.length > 0;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="520px"
      title={
        <DialogHeader
          title={title}
          subtitle="Revisa el correo antes de enviarlo"
          statusColor="sky"
        />
      }
      actionButton={
        <Button
          variant="primary"
          // Cerrado (animación de salida): un segundo clic no confirma otra vez.
          disabled={!hasRecipients || !open || confirmDisabled}
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
              <p className="text-rose-600 dark:text-rose-400">{noRecipientMessage}</p>
            )}
          </dd>
        </div>
        {subject !== undefined && (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Asunto
            </dt>
            <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{subject}</dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Adjunto
          </dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{attachmentName}</dd>
        </div>
      </dl>
    </MainDialog>
  );
}
