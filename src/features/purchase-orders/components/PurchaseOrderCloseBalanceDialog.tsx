"use client";

import { useId, useRef } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { useClosePurchaseOrderBalance } from "../hooks/useClosePurchaseOrderBalance";
import {
  ClosePurchaseOrderBalanceFormSchema,
  PURCHASE_ORDER_CLOSE_BALANCE_MOTIVO_MAX,
  type ClosePurchaseOrderBalanceFormValues,
} from "../schemas/purchase-order-close-balance.schema";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

type CloseBalanceFormField = keyof ClosePurchaseOrderBalanceFormValues;

const EMPTY_VALUES: ClosePurchaseOrderBalanceFormValues = { motivo: "" };

/**
 * Llaves del `400` con que el backend dice que la OC ya no admite el cierre:
 * no está Parcialmente recibida (`estatus`) o tiene recepciones esperando
 * calidad (`recepciones`). Reintentar no sirve: el diálogo se cierra y el toast
 * del hook trae el mensaje tal cual.
 */
const BLOCKING_KEYS = ["estatus", "recepciones"] as const;

interface PurchaseOrderCloseBalanceDialogProps {
  /**
   * Orden a cerrar. Se conserva mientras el diálogo se cierra (el padre no la
   * limpia hasta `onOpenChange(false)`), así que el texto no se vacía a mitad
   * de la animación.
   */
  order: Pick<PurchaseOrder, "id" | "folio"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo "Cerrar saldo" de una OC parcialmente recibida
 * (`POST /compras/ordenes/{id}/cerrar-saldo/`, EC-947), con motivo obligatorio.
 * Mismo patrón que `PurchaseOrderCancelDialog` (TanStack Form + Zod,
 * `useFormFieldErrors`, guarda síncrona contra el doble envío) y, como él, se
 * monta en la vista o en la página, nunca en la celda: al cerrar, el refetch
 * puede sacar la fila de una vista filtrada por estatus.
 *
 * Es una acción DISTINTA de cancelar: la OC conserva lo recibido y queda
 * Recibida con el saldo cerrado; lo que faltaba vuelve a ser necesidad
 * pendiente para comprarse en otra OC.
 */
export function PurchaseOrderCloseBalanceDialog({
  order,
  open,
  onOpenChange,
}: PurchaseOrderCloseBalanceDialogProps) {
  const maxHintId = useId();
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    clearServerErrors,
    clearAllErrors,
  } = useFormFieldErrors<CloseBalanceFormField>();

  const { mutate, isPending } = useClosePurchaseOrderBalance({
    onReasonError: (message) => setServerFieldError("motivo", message),
  });

  // Guarda SÍNCRONA contra el doble envío (ver `PurchaseOrderCancelDialog`).
  const submittingRef = useRef(false);

  const orderLabel = order ? (order.folio ?? `#${order.id}`) : "";

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    onSubmit: ({ value }) => {
      if (!order || submittingRef.current) return;
      clearServerErrors();

      const parsed = ClosePurchaseOrderBalanceFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        return;
      }
      clearClientFieldError("motivo");

      submittingRef.current = true;
      mutate(
        { id: order.id, motivo: parsed.data.motivo },
        {
          onSettled: () => {
            submittingRef.current = false;
          },
          // eslint-disable-next-line @typescript-eslint/no-use-before-define -- handleOpenChange usa form (declarado abajo); binding no primitivo, ver CLAUDE.md (EC-701)
          onSuccess: () => handleOpenChange(false),
          // La OC ya no admite el cierre: se cierra; el toast del hook explica
          // por qué y su refetch muestra la fila con su estatus real. Otro
          // error (403, red, 5xx) deja el diálogo abierto con el motivo escrito.
          onError: (error) => {
            if (BLOCKING_KEYS.some((key) => drfFieldMessage(error, key))) {
              // eslint-disable-next-line @typescript-eslint/no-use-before-define -- handleOpenChange usa form (declarado abajo); binding no primitivo, ver CLAUDE.md (EC-701)
              handleOpenChange(false);
            }
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
      title="Cerrar saldo"
      description={`La orden de compra ${orderLabel} quedará como recibida con lo que ya llegó: ya no se esperará el resto ni podrá recibirse más. Lo que faltaba de sus necesidades volverá a quedar pendiente para comprarse en otra orden. Esta acción no se puede deshacer.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <form.Field name="motivo">
          {(field) => (
            <FormTextarea
              label="Motivo del cierre"
              name={field.name}
              rows={3}
              placeholder="Explica por qué ya no se recibirá el resto"
              value={field.state.value}
              disabled={isPending}
              error={getError("motivo")}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("motivo");
              }}
              // Se valida al enviar, no en blur (ver `PurchaseOrderCancelDialog`).
              onBlur={field.handleBlur}
              aria-describedby={maxHintId}
            />
          )}
        </form.Field>
        <p id={maxHintId} className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          Máximo {PURCHASE_ORDER_CLOSE_BALANCE_MOTIVO_MAX} caracteres.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Cerrando…"
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            Cerrar saldo
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
