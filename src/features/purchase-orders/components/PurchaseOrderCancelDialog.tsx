"use client";

import { useRef } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { useCancelPurchaseOrder } from "../hooks/useCancelPurchaseOrder";
import {
  CancelPurchaseOrderFormFields,
  CancelPurchaseOrderFormSchema,
  type CancelPurchaseOrderFormValues,
} from "../schemas/purchase-order-cancel.schema";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

type CancelPurchaseOrderFormField = keyof CancelPurchaseOrderFormValues;

const EMPTY_VALUES: CancelPurchaseOrderFormValues = { motivo_cancelacion: "" };

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
 * TanStack Form con el schema Zod y `useFormFieldErrors` (errores del schema y
 * del backend sobre `motivo_cancelacion`, mismo patrón que `useSeguimientoForm`),
 * `FormTextarea`, `FormCancelButton`/`FormSubmitButton` y cierre al éxito. El motivo va SIN `forceUppercase`: es texto libre
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
  // Errores de `motivo_cancelacion`, del schema y del backend: ver `useFormFieldErrors`.
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    clearServerErrors,
    clearAllErrors,
  } = useFormFieldErrors<CancelPurchaseOrderFormField>();

  // El error de `motivo_cancelacion` se pinta bajo el textarea en vez de en un
  // toast; el resto de errores los notifica el hook.
  const { mutate, isPending } = useCancelPurchaseOrder({
    onReasonError: (message) => setServerFieldError("motivo_cancelacion", message),
  });

  // Guarda SÍNCRONA contra el doble envío. `isPending` no basta: dos clics en
  // el mismo tick corren en el mismo render y ambos leen `isPending === false`
  // (el `disabled` del botón llega hasta el siguiente render). La ref cambia al
  // instante y se libera cuando la mutación termina.
  const submittingRef = useRef(false);

  const orderLabel = order ? (order.folio ?? `#${order.id}`) : "";

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    onSubmit: ({ value }) => {
      if (!order || submittingRef.current) return;
      clearServerErrors();

      const parsed = CancelPurchaseOrderFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError(
          "motivo_cancelacion",
          parsed.error.issues[0]?.message ?? "Motivo inválido",
        );
        return;
      }
      clearClientFieldError("motivo_cancelacion");

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
    },
  });

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && isPending) return;
    // Limpia al cerrar para no arrastrar el borrador a la próxima orden.
    if (!next) {
      form.reset(EMPTY_VALUES);
      clearAllErrors();
    }
    onOpenChange(next);
  };

  const validateMotivo = (value: string) => {
    const parsed = CancelPurchaseOrderFormFields.motivo_cancelacion.safeParse(value);
    if (parsed.success) clearClientFieldError("motivo_cancelacion");
    else setClientFieldError("motivo_cancelacion", parsed.error.issues[0]?.message ?? "Motivo inválido");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
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
        <form.Field name="motivo_cancelacion">
          {(field) => (
            <FormTextarea
              label="Motivo de cancelación"
              name={field.name}
              rows={3}
              placeholder="Explica por qué se cancela la orden"
              value={field.state.value}
              disabled={isPending}
              error={getError("motivo_cancelacion")}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("motivo_cancelacion");
              }}
              onBlur={() => {
                field.handleBlur();
                validateMotivo(field.state.value);
              }}
            />
          )}
        </form.Field>
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
