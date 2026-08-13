"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useInvoiceDetail } from "../hooks/useInvoiceDetail";
import { InvoiceDetails } from "./InvoiceDetails";

interface InvoiceDetailByIdDialogProps {
  /** Id de la factura a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Armazón (MainDialog + DialogHeader) idéntico al que usa `InvoiceColumns`,
 *  para que el swap loader→contenido no cambie el chrome. */
function ShellDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      title={
        <DialogHeader
          title="Detalles de Facturación"
          subtitle="Información completa del registro"
          statusColor="sky"
        />
      }
    >
      {children}
    </MainDialog>
  );
}

/**
 * Envoltorio self-fetching de `InvoiceDetails`. `InvoiceDetails` NO es un diálogo:
 * es el CONTENIDO que la lista de facturación mete dentro de un `MainDialog`, y
 * es parent-injected —recibe el `Invoice` completo, no lo trae él, no acepta
 * `null` y no tiene estados de carga/error—. Este wrapper cierra esas brechas SIN
 * tocarlo, para exponer la firma por id (`{ orderId, open, onOpenChange }`) que
 * exige el registro `CLICKABLE_DOC_TIPOS` del detalle de pedido:
 *  1. trae la factura por id (`useInvoiceDetail`), con `factura_detalles`
 *     hidratados que el listado puede no incluir;
 *  2. gestiona loading / error / no-encontrado con su propio armazón, montando
 *     `InvoiceDetails` solo con el dato resuelto.
 *
 * No depende de la query del listado (`useInvoices`): fetchea por id.
 */
export function InvoiceDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: InvoiceDetailByIdDialogProps) {
  const { data: invoice, isLoading, isError, error } = useInvoiceDetail(orderId);

  if (isLoading) {
    return (
      <ShellDialog open={open} onOpenChange={onOpenChange}>
        <Loader title="Cargando detalle de la factura..." className="py-16" />
      </ShellDialog>
    );
  }

  // Error real de red, o consulta resuelta sin registro (404 fuera de tenant /
  // id inexistente): el backend fusiona ambos en un 404, un solo estado basta.
  if (isError || !invoice) {
    return (
      <ShellDialog open={open} onOpenChange={onOpenChange}>
        <ErrorState
          title="No se pudo cargar la factura"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a ella o falló la conexión.",
          )}
        />
      </ShellDialog>
    );
  }

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <InvoiceDetails invoice={invoice} />
    </ShellDialog>
  );
}
