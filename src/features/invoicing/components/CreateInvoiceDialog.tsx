"use client";

/**
 * CreateInvoiceDialog
 *
 * Diálogo de **un solo paso** para crear una factura desde un pedido. El
 * contrato del endpoint (`POST /finanzas/facturas/desde-pedido/`) recibe
 * únicamente `{ pedido }` —sin selección de partidas ni facturación parcial—,
 * por lo que un asistente multipaso (`MainDialog` + `StepProgressBar`) sería
 * complejidad innecesaria (decisión de arquitectura): basta un selector de
 * pedido buscable + un botón de confirmación.
 *
 * Los errores de envío (validación cliente, `400` "ya facturado" o `404` de
 * detalle) se notifican vía toast desde `useCreateInvoiceForm`; el diálogo no
 * renderiza texto de error en línea.
 *
 * El cuerpo (formulario + hook) vive en un componente interno que `MainDialog`
 * monta como `children`; al cerrarse, Radix lo desmonta y el estado se
 * reinicia, evitando arrastrar selección o errores previos al reabrir.
 */

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { InvoiceOrderSelector } from "./InvoiceOrderSelector";
import { useCreateInvoiceForm } from "../hooks/useCreateInvoiceForm";

interface CreateInvoiceDialogProps {
  /** Si el diálogo está abierto. Lo controla el padre. */
  open: boolean;
  /** Solicita abrir/cerrar el diálogo. */
  onOpenChange: (open: boolean) => void;
  /** Se invoca tras crear la factura correctamente (cierra el diálogo). */
  onSuccess: () => void;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInvoiceDialogProps) {
  return (
    <MainDialog
      title={
        <DialogHeader
          title="Nueva Factura"
          subtitle="Selecciona un pedido para facturar"
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="560px"
      showCloseButton={true}
    >
      <CreateInvoiceForm onSuccess={onSuccess} />
    </MainDialog>
  );
}

/**
 * Cuerpo del diálogo. Aislado para que se monte/desmonte con el contenido de
 * Radix (reinicio automático de formulario y errores al cerrar).
 */
function CreateInvoiceForm({ onSuccess }: { onSuccess: () => void }) {
  const { form, isSubmitting, handleFormSubmit } = useCreateInvoiceForm({
    onSuccess,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* El selector de pedido (con su input de búsqueda) vive fuera del
          <form>: así Enter dentro de la búsqueda no tiene envío implícito que
          prevenir (crearía una factura irreversible con una pulsación
          accidental). Sólo el <form> del botón "Crear factura" dispara el
          submit. */}
      <form.Field name="pedido">
        {(field) => (
          <InvoiceOrderSelector
            selectedOrderId={field.state.value}
            onSelect={(orderId) => field.handleChange(orderId)}
          />
        )}
      </form.Field>

      <form onSubmit={handleFormSubmit} className="flex justify-end pt-2">
        <form.Subscribe selector={(state) => state.values.pedido}>
          {(selectedOrderId) => (
            <FormSubmitButton
              isPending={isSubmitting}
              loadingLabel="Creando factura..."
              // `isSubmitting` va incluido en `disabled` a propósito: el spread
              // `{...props}` de FormSubmitButton pisa su guard interno de
              // `isPending`, así que sin esto el botón quedaría habilitado
              // durante el envío (mismo patrón que PurchaseOrderOnboardingStep2).
              disabled={selectedOrderId <= 0 || isSubmitting}
            >
              Crear factura
            </FormSubmitButton>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
