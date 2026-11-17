"use client";

/**
 * Confirmación de "Enviar correo" de una factura, sobre el correo ya preparado
 * (`usePrepareInvoiceEmail`): la usan el menú del listado (`InvoiceList`) y la
 * cabecera del detalle (`InvoiceMainSheet`). La vista y las reglas son las de
 * `SendEmailConfirmDialog`, igual que en cotizaciones; aquí solo va el texto.
 */
import { SendEmailConfirmDialog } from "@/src/features/google/components/SendEmailConfirmDialog";
import { usePdfCompany } from "@/src/hooks/usePdfCompany";
import type { PreparedInvoiceEmail } from "../hooks/useSendInvoiceEmail";

interface InvoiceSendEmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: PreparedInvoiceEmail;
  onConfirm: () => void;
}

export function InvoiceSendEmailConfirmDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
}: InvoiceSendEmailConfirmDialogProps) {
  // El PDF adjunto se genera al enviar y lleva la empresa en el encabezado
  // (EC-859): "Enviar" espera a que sus datos estén resueltos.
  const { pending: companyPending } = usePdfCompany();

  return (
    <SendEmailConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Enviar factura ${email.label}`}
      // El Route Handler ya validó el destinatario: `to` es una sola dirección.
      recipients={[email.content.to]}
      subject={email.content.subject}
      attachmentName={email.attachmentName}
      noRecipientMessage="La factura no tiene un correo de facturación válido, así que no hay a quién enviarla."
      onConfirm={onConfirm}
      confirmDisabled={companyPending}
    />
  );
}
