"use client";

import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { isDrfActionRejection, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { useRetenerPedido } from "../hooks/usePedidoRetencion";
import {
  PedidoRetenerFormSchema,
  type PedidoRetenerFormValues,
} from "../schemas/pedido-retener.schema";
import type { PedidoCancelTarget } from "./PedidoCancelDialog";
import { PedidoMotivoField } from "./PedidoMotivoField";

interface PedidoRetenerDialogProps {
  /** Pedido a retener; `null` = cerrado. */
  pedido: PedidoCancelTarget | null;
  onClose: () => void;
}

/**
 * "Retener pedido" con motivo obligatorio (`useRetenerPedido`). Quien lo monta
 * decide si se ofrece (Mesa de Control, pedido no cancelado ni retenido) y es
 * DUEÑO del estado: lo monta siempre y le pasa `pedido = null` para cerrarlo,
 * como `PedidoCancelDialog`, del que reusa el campo del motivo.
 *
 * No se cierra a media petición. Al terminar:
 * - éxito: se cierra;
 * - 400 de `motivo`: se queda abierto con el error bajo el campo;
 * - otro rechazo (`permiso`, `pedido` "ya está retenido") o 404: se cierra, el
 *   toast trae el motivo;
 * - red o 5xx: se queda abierto con el motivo escrito para reintentar.
 */
export function PedidoRetenerDialog({ pedido, onClose }: PedidoRetenerDialogProps) {
  const open = pedido !== null;
  const session = useDialogSession(open, pedido);
  const pedidoId = session.snapshot?.id ?? 0;
  const label = session.snapshot?.folio || `#${pedidoId}`;
  const { retener, isRetaining } = useRetenerPedido(pedidoId);

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isRetaining) onClose();
      }}
      maxWidth="480px"
      showCloseButton={false}
      title="Retener pedido"
      description={`El pedido ${label} quedará congelado sin cancelarse: no se podrá surtir, empacar, despachar ni generar órdenes de producción, bordado, reflejante o corte de manga sobre él hasta liberarlo. Lo que ya está en proceso sigue su curso.`}
    >
      <PedidoRetenerForm
        key={session.id}
        isRetaining={isRetaining}
        onClose={onClose}
        onSubmit={(motivo, handlers) =>
          retener(session.snapshot?.folio ?? null, motivo, {
            onSuccess: onClose,
            onError: handlers.onError,
            onMotivoError: handlers.onMotivoError,
          })
        }
      />
    </MainDialog>
  );
}

interface PedidoRetenerFormProps {
  isRetaining: boolean;
  onClose: () => void;
  onSubmit: (
    motivo: string,
    handlers: { onError: (error: unknown) => void; onMotivoError: (message: string) => void },
  ) => void;
}

/** Contenido del diálogo; se monta de nuevo en cada apertura (`key`), sin borrador previo. */
function PedidoRetenerForm({ isRetaining, onClose, onSubmit }: PedidoRetenerFormProps) {
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    clearServerErrors,
  } = useFormFieldErrors<keyof PedidoRetenerFormValues>();

  const form = useForm({
    defaultValues: { motivo: "" } satisfies PedidoRetenerFormValues,
    onSubmit: ({ value }) => {
      clearServerErrors();
      const parsed = PedidoRetenerFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        return;
      }
      clearClientFieldError("motivo");
      onSubmit(parsed.data.motivo, {
        onMotivoError: (message) => setServerFieldError("motivo", message),
        // Un rechazo de negocio o un 404 no se arreglan reintentando: se cierra
        // y el toast trae el motivo. Red o 5xx: sigue abierto con lo escrito.
        onError: (error) => {
          if (isDrfActionRejection(error) || isNotFoundError(error)) onClose();
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
          <PedidoMotivoField
            label="Motivo de la retención"
            name={field.name}
            placeholder="Por ejemplo: crédito vencido, el cliente pidió esperar"
            value={field.state.value}
            disabled={isRetaining}
            error={getError("motivo")}
            onValueChange={(value) => {
              field.handleChange(value);
              clearFieldErrors("motivo");
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isRetaining} />
        <FormSubmitButton
          isPending={isRetaining}
          loadingLabel="Reteniendo…"
          className="bg-amber-600! hover:bg-amber-700! focus:ring-amber-500!"
        >
          Retener pedido
        </FormSubmitButton>
      </div>
    </form>
  );
}
