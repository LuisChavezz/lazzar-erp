"use client";

import { createContext, useContext, useRef, useState } from "react";
import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { InvoiceListRow } from "../interfaces/invoice.interface";
import { getInvoiceEmailBlocker } from "../utils/invoiceEmailBlocker";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";
import { useDownloadInvoicePdf } from "./useDownloadInvoicePdf";
import {
  usePrepareInvoiceEmail,
  useSendInvoiceEmail,
  type PreparedInvoiceEmail,
} from "./useSendInvoiceEmail";

/**
 * - `pdf`: descarga el PDF.
 * - `email`: PREPARA el correo (valida y renderiza) para pedir confirmación.
 * - `send`: envía el correo ya preparado y confirmado.
 */
export type InvoiceListDocumentAction = "pdf" | "email" | "send";

type InvoiceListDocumentActionVariables =
  | { id: number; action: "pdf" | "email" }
  | { id: number; action: "send"; email: PreparedInvoiceEmail };

const LOADING_MESSAGES: Record<InvoiceListDocumentAction, string> = {
  pdf: "Generando PDF...",
  email: "Preparando correo...",
  send: "Enviando correo...",
};

export const invoiceListDocumentActionMutationKey = ["invoice-list-document-action"] as const;

/** Motivo propio de la acción del listado (retrieve fallido o correo bloqueado). */
class InvoiceListActionError extends Error {}

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Callbacks y "en vuelo" llegan al menú por contexto, NO por la factoría de
// columnas: así empezar o terminar una acción solo re-renderiza las celdas,
// sin remontarlas ni cerrar el menú abierto de otra fila. Mismo patrón que
// `useSupplierInvoiceRowActions`.

export interface InvoiceRowActionsContextValue {
  onDownloadPdf: (id: number) => void;
  onSendEmail: (id: number) => void;
  /** Ids de factura con una acción de PDF o correo en curso. */
  pendingIds: number[];
  /** ¿Se ofrece "Cancelar factura" en esta fila? (`canCancelInvoice`). */
  canCancel: (invoice: InvoiceListRow) => boolean;
  /** Abre el diálogo de cancelación, que vive en `InvoiceList` (no en la celda). */
  onCancel: (invoice: InvoiceListRow) => void;
}

const InvoiceRowActionsContext = createContext<InvoiceRowActionsContextValue | null>(null);

export const InvoiceRowActionsProvider = InvoiceRowActionsContext.Provider;

export function useInvoiceRowActionsContext(): InvoiceRowActionsContextValue {
  const value = useContext(InvoiceRowActionsContext);
  if (!value) {
    throw new Error(
      "Las acciones de fila de facturas deben renderizarse dentro de un InvoiceRowActionsProvider (ver InvoiceList).",
    );
  }
  return value;
}

/**
 * "Descargar PDF" y "Enviar correo" desde el menú de las filas del listado.
 * Se llama UNA vez, en `InvoiceList`, y llega a cada celda por
 * `InvoiceRowActionsProvider`.
 *
 * El listado ligero no trae `factura_detalles`, `correo_facturas` ni `activo`,
 * así que cada acción pide el retrieve FRESCO al activarse (nunca al abrir el
 * menú; `invoiceRetrieveFreshOptions`) y le pasa ese `Invoice` a las MISMAS
 * mutaciones que usa la página de detalle (`useDownloadInvoicePdf` /
 * `usePrepareInvoiceEmail` / `useSendInvoiceEmail`): mismo PDF, mismo correo y
 * mismos avisos. El correo se bloquea con la misma regla
 * (`getInvoiceEmailBlocker`), avisando el motivo, y como en el detalle se
 * prepara y se confirma (`emailConfirmation`, que el listado pinta con
 * `InvoiceSendEmailConfirmDialog`) antes de enviarse.
 *
 * "En curso" vive en la `MutationCache` (`useMutationState`), no en la celda:
 * sobrevive a que la celda se desmonte al ordenar o paginar, y se limpia solo
 * al terminar la mutación, con éxito o con error. Un segundo disparo de la
 * misma fila se descarta consultando la caché de forma síncrona (la mutación
 * queda `pending` en el mismo tick en que se dispara).
 */
export function useInvoiceListDocumentActions(): Omit<
  InvoiceRowActionsContextValue,
  "canCancel" | "onCancel"
> & {
  /** Correo preparado esperando confirmación, o `null` si no hay ninguno. */
  emailConfirmation: {
    email: PreparedInvoiceEmail;
    onClose: () => void;
    onConfirm: () => void;
  } | null;
} {
  const queryClient = useQueryClient();
  const { mutateAsync: downloadPdf } = useDownloadInvoicePdf();
  const { mutateAsync: prepareEmail } = usePrepareInvoiceEmail();
  const { mutateAsync: sendEmail } = useSendInvoiceEmail();
  const [preparedEmail, setPreparedEmail] = useState<PreparedInvoiceEmail | null>(null);
  // Turno del ÚLTIMO "Enviar correo" pedido: si mientras se prepara uno el
  // usuario pide el de otra fila, el primero ya no abre su confirmación encima.
  const emailTurnRef = useRef(0);

  const { mutate, mutateAsync } = useMutation<
    PreparedInvoiceEmail | void,
    unknown,
    InvoiceListDocumentActionVariables,
    { loadingId: string }
  >({
    mutationKey: invoiceListDocumentActionMutationKey,
    mutationFn: async (variables) => {
      // El correo confirmado ya trae su foto de la factura: no se vuelve a pedir.
      if (variables.action === "send") {
        await sendEmail(variables.email);
        return;
      }

      let invoice;
      try {
        invoice = await queryClient.fetchQuery(invoiceRetrieveFreshOptions(variables.id));
      } catch (error) {
        throw new InvoiceListActionError(
          extractErrorMessage(error, "No se pudo consultar la factura."),
        );
      }

      if (variables.action === "pdf") {
        await downloadPdf(invoice);
        return;
      }
      const blocker = getInvoiceEmailBlocker(invoice);
      if (blocker) throw new InvoiceListActionError(blocker.message);
      return prepareEmail(invoice);
    },
    onMutate: ({ action }) => ({
      loadingId: toast.loading(LOADING_MESSAGES[action]),
    }),
    onError: (error) => {
      // Los errores del PDF o del envío ya los avisó la mutación reutilizada.
      if (error instanceof InvoiceListActionError) toast.error(error.message);
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context) toast.dismiss(context.loadingId);
    },
  });

  const pendingIds = useMutationState({
    filters: { mutationKey: invoiceListDocumentActionMutationKey, status: "pending" },
    select: (mutation) => (mutation.state.variables as InvoiceListDocumentActionVariables).id,
  });

  const isInFlight = (id: number) =>
    queryClient.isMutating({
      mutationKey: invoiceListDocumentActionMutationKey,
      predicate: (mutation) =>
        (mutation.state.variables as InvoiceListDocumentActionVariables | undefined)?.id === id,
    }) > 0;

  const prepareAndConfirmEmail = async (id: number) => {
    if (isInFlight(id)) return;
    const turn = ++emailTurnRef.current;
    try {
      const email = await mutateAsync({ id, action: "email" });
      if (email && turn === emailTurnRef.current) setPreparedEmail(email);
    } catch {
      // El toast lo muestra la mutación (o la de preparar el correo).
    }
  };

  return {
    onDownloadPdf: (id) => {
      if (!isInFlight(id)) mutate({ id, action: "pdf" });
    },
    onSendEmail: (id) => void prepareAndConfirmEmail(id),
    pendingIds,
    emailConfirmation: preparedEmail && {
      email: preparedEmail,
      onClose: () => setPreparedEmail(null),
      onConfirm: () => {
        if (!isInFlight(preparedEmail.id)) {
          mutate({ id: preparedEmail.id, action: "send", email: preparedEmail });
        }
      },
    },
  };
}
