"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useForm } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { isDrfActionRejection } from "@/src/utils/drfWriteErrors";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { purchaseOrderStatusEntry } from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import type { PedidoCancelOcBloqueante } from "../interfaces/pedido-cancel.interface";
import { purchaseOrderLabel } from "../utils/pedidoCancelBlockingOcs";
import { useCancelPedido } from "../hooks/useCancelPedido";
import {
  PedidoCancelFormSchema,
  type PedidoCancelFormValues,
} from "../schemas/pedido-cancel.schema";
import { PedidoMotivoField } from "./PedidoMotivoField";

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
 * - 400 de OC en borrador o por autorizar (`ordenes_compra_bloqueantes`,
 *   EC-973): se queda abierto y lista esas OC, cada una ligada a su detalle
 *   si el usuario puede abrirlo; compras las cancela o autoriza y se reintenta;
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
      description={`Se cancelará el pedido ${label} y dejará de aparecer en los listados. Esta acción no se puede deshacer. No se puede cancelar mientras tenga documentos ligados activos (picking, empaque, facturas, órdenes de producción, bordado, reflejante o corte de manga) ni órdenes de compra en borrador o por autorizar; resuélvelos primero. Su pre-orden abierta se cancela y sus órdenes de compra autorizadas quedan marcadas para que compras decida.`}
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
            onBlockingOcs: handlers.onBlockingOcs,
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
    handlers: {
      onError: (error: unknown) => void;
      onMotivoError: (message: string) => void;
      onBlockingOcs: (ocs: PedidoCancelOcBloqueante[]) => void;
    },
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
  // OC que bloquearon el último intento (EC-973); se vacía al reintentar.
  const [blockingOcs, setBlockingOcs] = useState<PedidoCancelOcBloqueante[]>([]);

  const form = useForm({
    defaultValues: { motivo: "" } satisfies PedidoCancelFormValues,
    onSubmit: ({ value }) => {
      clearServerErrors();
      setBlockingOcs([]);
      const parsed = PedidoCancelFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        return;
      }
      clearClientFieldError("motivo");
      onSubmit(parsed.data.motivo, {
        onMotivoError: (message) => setServerFieldError("motivo", message),
        onBlockingOcs: setBlockingOcs,
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
      {blockingOcs.length > 0 && <PedidoCancelBlockingOcsNotice ocs={blockingOcs} />}
      <form.Field name="motivo">
        {(field) => (
          <PedidoMotivoField
            label="Motivo de cancelación"
            name={field.name}
            placeholder="Explica por qué se cancela el pedido"
            value={field.state.value}
            disabled={isCancelling}
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

/**
 * Las OC en borrador o por autorizar que impidieron cancelar (EC-973). Cada una
 * liga a su detalle solo si el usuario puede abrirlo (`canAccessRoute`, la
 * misma regla del proxy); si no, su folio queda como texto.
 */
function PedidoCancelBlockingOcsNotice({ ocs }: { ocs: PedidoCancelOcBloqueante[] }) {
  const { data: session } = useSession();
  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
    >
      <p className="font-medium">
        {ocs.length === 1
          ? "No se puede cancelar: el pedido tiene una orden de compra en borrador o por autorizar."
          : `No se puede cancelar: el pedido tiene ${ocs.length} órdenes de compra en borrador o por autorizar.`}
      </p>
      <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
        Compras debe cancelarlas o autorizarlas antes de cancelar el pedido.
      </p>
      <ul className="mt-2 space-y-1">
        {ocs.map((oc) => {
          const href = purchaseOrderDetailHref(oc.id);
          const label = purchaseOrderLabel(oc);
          const status = purchaseOrderStatusEntry(oc.estatus);
          return (
            <li key={oc.id} className="flex items-center gap-2">
              {canAccessRoute(href, session?.user) ? (
                <Link
                  href={href}
                  title="Ver orden de compra"
                  className="font-mono font-semibold text-sky-700 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                >
                  {label}
                </Link>
              ) : (
                <span className="font-mono font-semibold">{label}</span>
              )}
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${status.cls}`}
              >
                {status.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
