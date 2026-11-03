"use client";

/**
 * Confirmación de "Enviar correo" de una cotización (EC-563, ME-07), sobre el
 * correo ya preparado (`usePrepareQuoteEmail`). La vista y las reglas son las
 * de `SendEmailConfirmDialog`; aquí solo va el texto de la cotización.
 */
import { SendEmailConfirmDialog } from "../../google/components/SendEmailConfirmDialog";
import type { PreparedQuoteEmail } from "../../google/hooks/useGoogleSendEmail";

interface QuoteSendEmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: PreparedQuoteEmail;
  onConfirm: () => void;
}

export function QuoteSendEmailConfirmDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
}: QuoteSendEmailConfirmDialogProps) {
  return (
    <SendEmailConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Enviar cotización #${email.id}`}
      // La misma lista que se envía (`PreparedQuoteEmail.recipients`); sin
      // correo preparado no hay a quién enviarlo.
      recipients={email.content ? email.recipients : []}
      subject={email.content?.subject}
      attachmentName={email.attachmentName}
      noRecipientMessage="La cotización no tiene un correo de facturación válido, así que no hay a quién enviarla."
      onConfirm={onConfirm}
    />
  );
}
