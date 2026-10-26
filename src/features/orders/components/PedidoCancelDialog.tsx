"use client";

import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { isDrfActionRejection } from "@/src/utils/drfWriteErrors";
import { useCancelPedido } from "../hooks/useCancelPedido";
import {
  PEDIDO_CANCEL_MOTIVO_MAX,
  PedidoCancelFormSchema,
  fitPedidoCancelMotivo,
  pedidoCancelMotivoLength,
  type PedidoCancelFormValues,
} from "../schemas/pedido-cancel.schema";

type PedidoCancelFormField = keyof PedidoCancelFormValues;

/** Lo que el diálogo necesita del pedido: sirve una fila del listado o el detalle. */
export interface PedidoCancelTarget {
  id: number;
  folio: string | null;
}

interface PedidoCancelDialogProps {
  /** Pedido a cancelar; `null` = cerrado. */
  pedido: PedidoCancelTarget | null;
  onClose: () => void;
  /** Tras cancelar (con los listados ya releídos), antes de cerrar. */
  onCancelled?: () => void;
}

/**
 * "Cancelar pedido" con motivo obligatorio (`useCancelPedido`). Quien lo monta
 * decide si se ofrece (permiso + estatus) y es DUEÑO del estado: lo monta
 * siempre y le pasa `pedido = null` para cerrarlo, así el diálogo sobrevive a
 * que la fila desaparezca del listado al cancelarse.
 *
 * `MainDialog` + TanStack Form con el schema Zod y `useFormFieldErrors` (mismo
 * patrón que `useSeguimientoForm`). El motivo va con `forceUppercase`, como el texto
 * libre del resto del pedido (comentarios de programación) y el motivo de
 * cancelación de facturas.
 *
 * No se cierra a media petición. Al terminar:
 * - éxito o 404 (ya estaba cancelado): se cierra;
 * - 400 de `motivo`: se queda abierto con el error bajo el campo;
 * - otro rechazo de negocio (`isDrfActionRejection`: `permiso`, `pedido`): se
 *   cierra, el toast trae el motivo;
 * - red o 5xx: se queda abierto con el motivo escrito para reintentar.
 */
export function PedidoCancelDialog({ pedido, onClose, onCancelled }: PedidoCancelDialogProps) {
  const open = pedido !== null;
  const session = useDialogSession(open, pedido);
  const pedidoId = session.snapshot?.id ?? 0;
  const label = session.snapshot?.folio || `#${pedidoId}`;
  const { cancel, isCancelling } = useCancelPedido(pedidoId);

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isCancelling) onClose();
      }}
      maxWidth="480px"
      showCloseButton={false}
      title="Cancelar pedido"
      description={`Se cancelará el pedido ${label} y dejará de aparecer en los listados: el inventario que se le descontó al autorizarlo vuelve a existencias y sus reservas activas se liberan. Esta acción no se puede deshacer. No se puede cancelar mientras tenga documentos ligados activos (picking, empaque, facturas, órdenes de producción, bordado, reflejante o corte de manga); cancélalos primero.`}
    >
      <PedidoCancelForm
        key={session.id}
        isCancelling={isCancelling}
        onClose={onClose}
        onSubmit={(motivo, handlers) =>
          cancel(session.snapshot?.folio ?? null, motivo, {
            onSuccess: () => {
              onCancelled?.();
              onClose();
            },
            onError: handlers.onError,
            onMotivoError: handlers.onMotivoError,
          })
        }
      />
    </MainDialog>
  );
}

interface PedidoCancelFormProps {
  isCancelling: boolean;
  onClose: () => void;
  onSubmit: (
    motivo: string,
    handlers: { onError: (error: unknown) => void; onMotivoError: (message: string) => void },
  ) => void;
}

/** Contenido del diálogo; se monta de nuevo en cada apertura (`key`), sin borrador previo. */
function PedidoCancelForm({ isCancelling, onClose, onSubmit }: PedidoCancelFormProps) {
  // Errores de `motivo`, del schema y del backend: ver `useFormFieldErrors`.
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    clearServerErrors,
  } = useFormFieldErrors<PedidoCancelFormField>();

  const form = useForm({
    defaultValues: { motivo: "" } satisfies PedidoCancelFormValues,
    onSubmit: ({ value }) => {
      clearServerErrors();
      const parsed = PedidoCancelFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        return;
      }
      clearClientFieldError("motivo");
      onSubmit(parsed.data.motivo, {
        onMotivoError: (message) => setServerFieldError("motivo", message),
        // Un rechazo de negocio (`permiso`, `pedido`) no se arregla
        // reintentando: se cierra y el toast trae el motivo. Red o 5xx: sigue
        // abierto con lo escrito.
        onError: (error) => {
          if (isDrfActionRejection(error)) onClose();
        },
      });
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 py-1">
      <form.Field name="motivo">
        {(field) => (
          <div>
            {/* Sin `maxLength` nativo: cuenta otra cosa que el backend (ver
                `PEDIDO_CANCEL_MOTIVO_MAX`); el tope lo pone `fitPedidoCancelMotivo`.
                Sin validación en blur (como `PurchaseOrderCancelDialog`): al
                pulsar "Volver" o al cerrar, pintaría "Indica el motivo…" con el
                campo vacío. Se valida al enviar. */}
            <FormTextarea
              label="Motivo de cancelación"
              name={field.name}
              rows={3}
              placeholder="Explica por qué se cancela el pedido"
              value={field.state.value}
              forceUppercase
              disabled={isCancelling}
              error={getError("motivo")}
              onChange={(event) => {
                const textarea = event.currentTarget;
                const fitted = fitPedidoCancelMotivo(field.state.value, textarea.value);
                // El recorte se escribe en el DOM ANTES de pasarlo al estado,
                // con el cursor al final de lo que sí entró: así el valor del
                // DOM ya coincide con el del estado, React no lo reescribe y
                // el cursor no salta al final (mismo truco que `forceUppercase`
                // en `FormTextarea`).
                if (fitted) {
                  textarea.value = fitted.value;
                  textarea.setSelectionRange(fitted.caret, fitted.caret);
                }
                field.handleChange(textarea.value);
                clearFieldErrors("motivo");
              }}
              onBlur={field.handleBlur}
            />
            <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
              {pedidoCancelMotivoLength(field.state.value)}/{PEDIDO_CANCEL_MOTIVO_MAX}
            </p>
          </div>
        )}
      </form.Field>
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isCancelling} />
        <FormSubmitButton
          isPending={isCancelling}
          loadingLabel="Cancelando…"
          className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
        >
          Cancelar pedido
        </FormSubmitButton>
      </div>
    </form>
  );
}
