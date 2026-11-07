"use client";

import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { isRecordMutating } from "@/src/utils/mutationRecordId";
import {
  useSendEmailConfirmation,
  type SendEmailDialogSession,
} from "@/src/features/google/hooks/useSendEmailConfirmation";
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
// columnas (ver `createRowActionsContext`).

export interface InvoiceRowActionsContextValue {
  onDownloadPdf: (id: number) => void;
  onSendEmail: (id: number) => void;
  /** Ids de factura con una acción de PDF o correo en curso. */
  pendingIds: number[];
  /** ¿Se ofrece "Cancelar factura" en esta fila? (`canCancelInvoice`). */
  canCancel: (invoice: InvoiceListRow) => boolean;
  /** Abre el diálogo de cancelación, que vive en `InvoiceList` (no en la celda). */
  onCancel: (invoice: InvoiceListRow) => void;
  /** ¿Se ofrece "Cancelar CFDI ante el SAT" en esta fila? (`canCancelCancelledInvoiceCfdi`). */
  canCancelCfdi: (invoice: InvoiceListRow) => boolean;
  /** Abre el diálogo de cancelación del CFDI, que vive en `InvoiceList`. */
  onCancelCfdi: (invoice: InvoiceListRow) => void;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<InvoiceRowActionsContextValue>("FolioCell (facturas)", "InvoiceList");

/** Callbacks del menú de fila (`InvoiceColumns`); ver `createRowActionsContext`. */
export const InvoiceRowActionsProvider = Provider;
export const useInvoiceRowActionsContext = useRowActionsContext;

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
 * prepara y se confirma (`emailDialog`, de `useSendEmailConfirmation`, que el
 * listado pinta con `InvoiceSendEmailConfirmDialog`) antes de enviarse.
 *
 * "En curso" vive en la `MutationCache` (`useMutationState`), no en la celda:
 * sobrevive a que la celda se desmonte al ordenar o paginar, y se limpia solo
 * al terminar la mutación, con éxito o con error. Un segundo disparo de la
 * misma fila se descarta consultando la caché de forma síncrona (la mutación
 * queda `pending` en el mismo tick en que se dispara).
 */
export function useInvoiceListDocumentActions(): Omit<
  InvoiceRowActionsContextValue,
  "canCancel" | "onCancel" | "canCancelCfdi" | "onCancelCfdi"
> & {
  /** Sesión del diálogo de confirmación del correo (`useSendEmailConfirmation`). */
  emailDialog: SendEmailDialogSession<PreparedInvoiceEmail> | null;
} {
  const queryClient = useQueryClient();
  const { mutateAsync: downloadPdf } = useDownloadInvoicePdf();
  const { mutateAsync: prepareEmail } = usePrepareInvoiceEmail();
  const { mutateAsync: sendEmail } = useSendInvoiceEmail();

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

  // Preparar y enviar corren por la mutación del listado (consulta fresca,
  // regla de bloqueo y toast de "en curso"), así que esa es la que ocupa la fila.
  const email = useSendEmailConfirmation<PreparedInvoiceEmail>({
    busyMutationKeys: [invoiceListDocumentActionMutationKey],
    prepare: async (id) => {
      const prepared = await mutateAsync({ id, action: "email" });
      if (!prepared) throw new Error("La acción \"email\" siempre devuelve el correo preparado.");
      return prepared;
    },
    send: (prepared) => mutate({ id: prepared.id, action: "send", email: prepared }),
  });

  return {
    onDownloadPdf: (id) => {
      if (!isRecordMutating(queryClient, [invoiceListDocumentActionMutationKey], id)) {
        mutate({ id, action: "pdf" });
      }
    },
    onSendEmail: email.request,
    pendingIds,
    emailDialog: email.dialog,
  };
}
