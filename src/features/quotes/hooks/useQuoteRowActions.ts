"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutationState } from "@tanstack/react-query";
import {
  approveOperationsQuoteMutationKey,
  useApproveOperationsQuote,
} from "../../operations/hooks/useApproveOperationsQuote";
import {
  rejectOperationsQuoteMutationKey,
  useRejectOperationsQuote,
} from "../../operations/hooks/useRejectOperationsQuote";
import {
  sendQuoteEmailMutationKey,
  useGoogleSendEmail,
} from "../../google/hooks/useGoogleSendEmail";
import { downloadQuotePdfMutationKey, useDownloadQuotePdf } from "./useDownloadQuotePdf";
import { submitQuoteForReviewMutationKey, useSubmitQuoteForReview } from "./useSubmitQuoteForReview";
import { useQuoteReviewValidationFlow } from "./useQuoteReviewValidationFlow";
import { validateQuoteForReviewMutationKey } from "./useValidateQuoteForReview";
import type { Quote } from "../interfaces/quote.interface";
import { canManageQuoteAuthorization } from "../utils/quoteStatusRules";

/** Acciones que ofrece el menú de una cotización (`QuoteCardActions`). */
export type QuoteRowAction =
  | "view"
  | "edit"
  | "submitForReview"
  | "sendEmail"
  | "downloadPdf"
  | "authorize"
  | "reject";

/**
 * Trabajo en curso sobre UNA cotización, para que el menú de esa fila (y
 * solo esa) pinte "Enviando…"/"Generando PDF…" y deshabilite lo que
 * corresponde — el mismo alcance por fila que tenían los hooks cuando vivían
 * dentro de la celda. `validateReview` es la validación previa a "Enviar a
 * revisión" (etiqueta "Verificando…").
 */
export interface QuoteRowBusy {
  kind: QuoteRowAction | "validateReview";
  quoteId: number;
}

/**
 * Ids de cotización con una mutación `kind` EN CURSO, leídos de la
 * `MutationCache` (no de la instancia de `useMutation`): una instancia solo
 * recuerda su ÚLTIMA llamada, así que "Descargar PDF" en #118 y luego en
 * #117 dejaría a #118 sin su "Generando PDF…" aunque siga en vuelo. La caché
 * conserva todas las mutaciones pendientes, con sus `variables` (el id),
 * vengan de esta vista o de otra (listado y tablero comparten las claves).
 */
function usePendingQuoteIds(mutationKey: readonly unknown[]): number[] {
  return useMutationState({
    filters: { mutationKey: mutationKey as unknown[], status: "pending" },
    select: (mutation) => mutation.state.variables as number,
  });
}

/** Diálogos que abre el menú; el resto de acciones son inmediatas. */
export type QuoteRowDialogKind = "view" | "authorize" | "reject" | "submitForReview";

export interface QuoteRowDialogState {
  kind: QuoteRowDialogKind;
  /**
   * Foto de la cotización al abrir. `QuoteRowActionDialogs` la usa solo como
   * respaldo si el registro ya no está en la consulta (p. ej. lo borraron);
   * mientras exista, resuelve el dato vivo por id.
   */
  quote: Quote;
}

/**
 * Dueño, a nivel de VISTA, de las acciones de fila de cotizaciones: las
 * mutaciones, la validación previa a revisión y el estado de los diálogos
 * (ver detalles / autorizar / rechazar / enviar a revisión).
 *
 * Antes cada celda (`QuoteCardActions`) tenía sus propios hooks y sus propios
 * diálogos. Eso rompía la convención del repo — un diálogo cuyo registro
 * puede cambiar de estado mientras está abierto lo posee la vista, no la
 * celda —: con un filtro de estatus activo, autorizar una cotización la
 * sacaba de la vista, la celda se desmontaba y se llevaba el diálogo. Además
 * costaba 5 `useMutation` + 4 diálogos por fila (20 filas por página).
 *
 * Uso: `const { onAction, busy, dialogs } = useQuoteRowActions();` — `onAction`
 * y `busy` bajan al menú; `dialogs` se pasa a `<QuoteRowActionDialogs>` junto
 * con la lista completa de cotizaciones para resolver el registro vivo.
 */
export function useQuoteRowActions() {
  const router = useRouter();
  const [dialog, setDialog] = useState<QuoteRowDialogState | null>(null);

  const approve = useApproveOperationsQuote();
  const reject = useRejectOperationsQuote();
  const sendEmail = useGoogleSendEmail();
  const downloadPdf = useDownloadQuotePdf();
  const submitForReview = useSubmitQuoteForReview();
  const review = useQuoteReviewValidationFlow();

  const onAction = async (action: QuoteRowAction, quote: Quote) => {
    switch (action) {
      case "view":
        setDialog({ kind: "view", quote });
        return;
      case "edit":
        router.push(`/sales/quotes/${quote.id}/edit`);
        return;
      case "sendEmail":
        sendEmail.mutate(quote.id);
        return;
      case "downloadPdf":
        downloadPdf.mutate(quote.id);
        return;
      case "authorize":
      case "reject":
        // Misma guarda de NEGOCIO que tenía la celda: fuera de un estatus
        // autorizable el diálogo no se abre (el ítem tampoco es visible).
        if (!canManageQuoteAuthorization(quote.estatus)) return;
        setDialog({ kind: action, quote });
        return;
      case "submitForReview": {
        const status = await review.validateBeforeSendToReview(quote.id);
        if (status === "valid") setDialog({ kind: "submitForReview", quote });
        return;
      }
    }
  };

  // El "en curso" se acota a la fila que lo disparó (el id es la `variable`
  // de cada mutación), igual que cuando los hooks vivían en la celda — ver
  // `usePendingQuoteIds` para por qué se lee de la caché y no de la instancia.
  const authorizing = usePendingQuoteIds(approveOperationsQuoteMutationKey);
  const rejecting = usePendingQuoteIds(rejectOperationsQuoteMutationKey);
  const sendingEmail = usePendingQuoteIds(sendQuoteEmailMutationKey);
  const downloadingPdf = usePendingQuoteIds(downloadQuotePdfMutationKey);
  const submittingForReview = usePendingQuoteIds(submitQuoteForReviewMutationKey);
  const validatingReview = usePendingQuoteIds(validateQuoteForReviewMutationKey);
  const busy: QuoteRowBusy[] = [
    ...authorizing.map((quoteId) => ({ kind: "authorize" as const, quoteId })),
    ...rejecting.map((quoteId) => ({ kind: "reject" as const, quoteId })),
    ...sendingEmail.map((quoteId) => ({ kind: "sendEmail" as const, quoteId })),
    ...downloadingPdf.map((quoteId) => ({ kind: "downloadPdf" as const, quoteId })),
    ...submittingForReview.map((quoteId) => ({ kind: "submitForReview" as const, quoteId })),
    ...validatingReview.map((quoteId) => ({ kind: "validateReview" as const, quoteId })),
  ];

  const dialogs = {
    dialog,
    onClose: () => setDialog(null),
    onAuthorize: (quoteId: number) => approve.mutate(quoteId),
    onReject: (quoteId: number) => reject.mutate(quoteId),
    onSubmitForReview: (quoteId: number) => submitForReview.mutate(quoteId),
    isAuthorizing: approve.isPending,
    isRejecting: reject.isPending,
    isSubmittingForReview: submitForReview.isPending,
    reviewValidation: {
      open: review.isReviewValidationDialogOpen,
      onOpenChange: review.setIsReviewValidationDialogOpen,
      quoteId: review.validationQuoteId,
      errors: review.reviewValidationErrors,
    },
  };

  return { onAction, busy, dialogs };
}

export type QuoteRowActionDialogsState = ReturnType<typeof useQuoteRowActions>["dialogs"];

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// `onAction` y `busy` llegan al menú (`QuoteCardActions`) por contexto, NO por
// props de columna: si `busy` viajara dentro de `getQuoteColumns({ busy })`,
// cada cambio de "en curso" crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas (se cierra el menú abierto, se pierde el foco,
// caducan las refs). Con contexto las columnas son un arreglo estático y solo
// re-renderiza el menú que lo consume.

export interface QuoteRowActionsContextValue {
  onAction: (action: QuoteRowAction, quote: Quote) => void;
  busy: QuoteRowBusy[];
}

const QuoteRowActionsContext = createContext<QuoteRowActionsContextValue | null>(null);

export const QuoteRowActionsProvider = QuoteRowActionsContext.Provider;

/** Para `QuoteCardActions`: exige estar bajo un `QuoteRowActionsProvider` (listado o tablero). */
export function useQuoteRowActionsContext(): QuoteRowActionsContextValue {
  const value = useContext(QuoteRowActionsContext);
  if (!value) {
    throw new Error(
      "QuoteCardActions debe renderizarse dentro de un QuoteRowActionsProvider (ver useQuoteRowActions)."
    );
  }
  return value;
}

/** Helper para el menú: ¿hay trabajo `kind` en curso sobre esta cotización? */
export function isQuoteRowBusy(busy: QuoteRowBusy[], kind: QuoteRowBusy["kind"], quoteId: number) {
  return busy.some((b) => b.kind === kind && b.quoteId === quoteId);
}
