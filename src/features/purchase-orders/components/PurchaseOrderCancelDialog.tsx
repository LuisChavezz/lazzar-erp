"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { useCancelPurchaseOrder } from "../hooks/useCancelPurchaseOrder";
import { CancelPurchaseOrderFormSchema } from "../schemas/purchase-order-cancel.schema";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

interface PurchaseOrderCancelDialogProps {
  /**
   * Orden a cancelar. Se conserva mientras el diálogo se cierra (el padre no
   * la limpia hasta `onOpenChange(false)`), así que el texto no se vacía a
   * mitad de la animación.
   */
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de CANCELACIÓN de una orden de compra
 * (`POST /compras/ordenes/{id}/cancelar/`), con motivo obligatorio.
 *
 * Se monta en `PurchaseOrderView`, NO en la celda de acciones: al cancelar, el
 * refetch puede sacar la fila de una vista filtrada por estatus y la celda —con
 * su diálogo— se desmontaría a media operación.
 *
 * Mismo esqueleto que `EmbroideryCreateAvanceDialog` (input controlado +
 * `safeParse` al enviar, `FormTextarea`, `FormCancelButton`/`FormSubmitButton`
 * y cierre al éxito). El motivo va SIN `forceUppercase`: es texto libre
 * para explicar una decisión, igual que el `motivo` de notas de crédito y las
 * observaciones de finanzas.
 *
 * Los botones evitan la palabra "Cancelar" sola: aquí sería ambiguo si
 * descarta el diálogo o cancela la orden.
 */
export function PurchaseOrderCancelDialog({
  order,
  open,
  onOpenChange,
}: PurchaseOrderCancelDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

  // El error de `motivo_cancelacion` se pinta bajo el textarea en vez de en un
  // toast; el resto de errores los notifica el hook.
  const { mutate, isPending } = useCancelPurchaseOrder({
    onReasonError: setMotivoError,
  });

  // Guarda SÍNCRONA contra el doble envío. `isPending` no basta: dos clics en
  // el mismo tick corren en el mismo render y ambos leen `isPending === false`
  // (el `disabled` del botón llega hasta el siguiente render). La ref cambia al
  // instante y se libera cuando la mutación termina.
  const submittingRef = useRef(false);

  const orderLabel = order ? (order.folio ?? `#${order.id}`) : "";

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && isPending) return;
    // Limpia al cerrar para no arrastrar el borrador a la próxima orden.
    if (!next) {
      setMotivo("");
      setMotivoError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order || submittingRef.current) return;

    const parsed = CancelPurchaseOrderFormSchema.safeParse({
      motivo_cancelacion: motivo,
    });
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }

    submittingRef.current = true;
    mutate(
      { id: order.id, payload: parsed.data },
      {
        onSettled: () => {
          submittingRef.current = false;
        },
        onSuccess: () => handleOpenChange(false),
        // Un error de `estatus` (p. ej. "La orden ya no puede cancelarse.")
        // significa que la orden ya es terminal: reintentar no sirve. Se
        // cierra; el toast del hook explica el motivo y su refetch muestra la
        // fila con su estatus real. Cualquier otro error (red, 5xx, forma
        // inesperada) deja el diálogo abierto con el motivo escrito.
        onError: (error) => {
          if (drfFieldMessage(error, "estatus")) handleOpenChange(false);
        },
      },
    );
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title="Cancelar Orden de Compra"
      description={`La orden de compra ${orderLabel} quedará registrada como cancelada: ya no podrá editarse, confirmarse ni recibirse. Esta acción no se puede deshacer.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <FormTextarea
          label="Motivo de cancelación"
          name="motivo_cancelacion"
          rows={3}
          placeholder="Explica por qué se cancela la orden"
          value={motivo}
          disabled={isPending}
          error={motivoError ? { message: motivoError } : undefined}
          onChange={(event) => {
            setMotivo(event.target.value);
            if (motivoError) setMotivoError(null);
          }}
        />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton
            label="Volver"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Cancelando…"
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            Cancelar orden
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
