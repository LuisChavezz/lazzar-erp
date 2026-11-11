"use client";

/**
 * Confirmación de "Enviar correo" de una orden de compra, sobre el correo ya
 * preparado (`usePreparePurchaseOrderEmail`). La monta la vista del listado
 * (`PurchaseOrderView`), no la celda. La vista y las reglas son las de
 * `SendEmailConfirmDialog`, igual que en cotizaciones y facturas; aquí solo va
 * el texto.
 */
import { SendEmailConfirmDialog } from "@/src/features/google/components/SendEmailConfirmDialog";
import type { PreparedPurchaseOrderEmail } from "../hooks/useSendPurchaseOrderEmail";
import { usePdfCompany } from "@/src/hooks/usePdfCompany";

interface PurchaseOrderSendEmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: PreparedPurchaseOrderEmail;
  onConfirm: () => void;
}

export function PurchaseOrderSendEmailConfirmDialog({
  open,
  onOpenChange,
  email,
  onConfirm,
}: PurchaseOrderSendEmailConfirmDialogProps) {
  // El PDF adjunto se genera al enviar y lleva la empresa en el encabezado:
  // "Enviar" espera a que sus datos estén resueltos (`usePdfCompany`).
  const { pending: companyPending } = usePdfCompany();

  return (
    <SendEmailConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Enviar orden de compra ${email.label}`}
      // El Route Handler ya validó el destinatario: `to` es el correo del proveedor.
      recipients={[email.content.to]}
      subject={email.content.subject}
      attachmentName={email.attachmentName}
      noRecipientMessage="La orden de compra no tiene un correo de proveedor válido, así que no hay a quién enviarla."
      onConfirm={onConfirm}
      confirmDisabled={companyPending}
    />
  );
}
