"use client";

import { createContext, useContext } from "react";
import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getInvoiceEmailBlocker } from "../utils/invoiceEmailBlocker";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";
import { useDownloadInvoicePdf } from "./useDownloadInvoicePdf";
import { useSendInvoiceEmail } from "./useSendInvoiceEmail";

export type InvoiceListDocumentAction = "pdf" | "email";

interface InvoiceListDocumentActionVariables {
  id: number;
  action: InvoiceListDocumentAction;
}

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
 * `useSendInvoiceEmail`): mismo PDF, mismo correo y mismos avisos. El correo
 * se bloquea con la misma regla (`getInvoiceEmailBlocker`), avisando el motivo.
 *
 * "En curso" vive en la `MutationCache` (`useMutationState`), no en la celda:
 * sobrevive a que la celda se desmonte al ordenar o paginar, y se limpia solo
 * al terminar la mutación, con éxito o con error. Un segundo disparo de la
 * misma fila se descarta consultando la caché de forma síncrona (la mutación
 * queda `pending` en el mismo tick en que se dispara).
 */
export function useInvoiceListDocumentActions(): InvoiceRowActionsContextValue {
  const queryClient = useQueryClient();
  const { mutateAsync: downloadPdf } = useDownloadInvoicePdf();
  const { mutateAsync: sendEmail } = useSendInvoiceEmail();

  const { mutate } = useMutation<
    void,
    unknown,
    InvoiceListDocumentActionVariables,
    { loadingId: string }
  >({
    mutationKey: invoiceListDocumentActionMutationKey,
    mutationFn: async ({ id, action }) => {
      let invoice;
      try {
        invoice = await queryClient.fetchQuery(invoiceRetrieveFreshOptions(id));
      } catch (error) {
        throw new InvoiceListActionError(
          extractErrorMessage(error, "No se pudo consultar la factura."),
        );
      }

      if (action === "pdf") {
        await downloadPdf(invoice);
        return;
      }
      const blocker = getInvoiceEmailBlocker(invoice);
      if (blocker) throw new InvoiceListActionError(blocker.message);
      await sendEmail(invoice);
    },
    onMutate: ({ action }) => ({
      loadingId: toast.loading(action === "pdf" ? "Generando PDF..." : "Enviando correo..."),
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

  const trigger = (id: number, action: InvoiceListDocumentAction) => {
    const inFlight = queryClient.isMutating({
      mutationKey: invoiceListDocumentActionMutationKey,
      predicate: (mutation) =>
        (mutation.state.variables as InvoiceListDocumentActionVariables | undefined)?.id === id,
    });
    if (inFlight > 0) return;
    mutate({ id, action });
  };

  return {
    onDownloadPdf: (id) => trigger(id, "pdf"),
    onSendEmail: (id) => trigger(id, "email"),
    pendingIds,
  };
}
