"use client";

import { createContext, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutationState } from "@tanstack/react-query";
import {
  approveOperationsQuoteMutationKey,
  useApproveOperationsQuote,
} from "../../operations/hooks/useApproveOperationsQuote";
import { rejectOperationsQuoteMutationKey } from "../../operations/hooks/useRejectOperationsQuote";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import {
  prepareQuoteEmailMutationKey,
  sendQuoteEmailMutationKey,
  useGoogleSendEmail,
  usePrepareQuoteEmail,
  type PreparedQuoteEmail,
} from "../../google/hooks/useGoogleSendEmail";
import { useSendEmailConfirmation } from "../../google/hooks/useSendEmailConfirmation";
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
 * revisión" (etiqueta "Verificando…") y `prepareEmail`, la preparación del
 * correo antes de confirmarlo (etiqueta "Preparando…").
 */
export interface QuoteRowBusy {
  kind: QuoteRowAction | "validateReview" | "prepareEmail";
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
    // Las variables son el id o un objeto con `id` (rechazar lleva el motivo;
    // enviar a revisión, el comentario opcional).
    select: selectMutationRecordId,
  });
}

/**
 * Diálogos que abre el menú; el resto de acciones son inmediatas. La
 * confirmación de "Enviar correo" no está aquí: la sesiona
 * `useSendEmailConfirmation` (`dialogs.emailDialog`).
 */
export type QuoteRowDialogKind = "view" | "authorize" | "reject" | "submitForReview";

interface QuoteRowDialogBase {
  /**
   * Foto de la cotización al abrir. `QuoteRowActionDialogs` resuelve encima
   * su estatus VIVO (`useLiveQuoteStatus`): lo cargado por la vista y el
   * detalle leído al abrir; sin cambio en ninguno, vale la foto.
   */
  quote: Quote;
  /** Momento (ms) en que se abrió: lo leído antes no dice nada del estado de ahora. */
  openedAt: number;
}

export type QuoteRowDialogState = QuoteRowDialogBase & { kind: QuoteRowDialogKind };

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
 * con las filas que la vista tiene cargadas (ver `useLiveQuoteStatus`).
 */
export function useQuoteRowActions() {
  const router = useRouter();
  const [dialog, setDialog] = useState<QuoteRowDialogState | null>(null);
  // Turno de la ÚLTIMA acción que abre diálogo, en cualquier menú. "Enviar a
  // revisión" abre el suyo solo tras validar en red; si mientras tanto el
  // usuario pidió otro diálogo (p. ej. "Ver detalles" de otra fila), el turno
  // ya no es el suyo y no debe reemplazar lo que el usuario abrió después.
  // PDF y editar no abren diálogo y no cuentan; el correo abre su confirmación
  // al terminar de prepararse, y también respeta el turno.
  const dialogTurnRef = useRef(0);

  // `mutateAsync` y no `mutate`: el candado se suelta sobre la PROMESA de
  // cada llamada; los callbacks por llamada de `mutate` solo corren para la
  // última.
  const { mutateAsync: approveAsync } = useApproveOperationsQuote();
  // Candado SÍNCRONO por cotización para autorizar (`useRowActionLock`): el
  // "en curso" de la MutationCache llega en un render posterior, así que el
  // segundo clic de un doble clic lo encontraría libre y mandaría otro
  // `autorizar/`. La ref del candado ya está tomada en ese clic, y su
  // `guardClose` deja la confirmación abierta y bloqueada (Esc, "Cancelar",
  // clic fuera) hasta que la petición termina.
  const authorizeLock = useRowActionLock();
  // Rechazar no tiene mutación aquí: la posee `RejectQuoteDialog` (motivo
  // obligatorio, errores bajo el campo). Su "en curso" se lee de la caché.
  const prepareEmail = usePrepareQuoteEmail();
  const sendEmail = useGoogleSendEmail();
  // Confirmación de "Enviar correo" (EC-563, ME-07): se prepara y se pide
  // confirmación con destinatario, asunto y adjunto; nada se envía hasta
  // confirmar. Los demás diálogos la invalidan (`email.invalidate()`) para que
  // un correo que termina de prepararse no se abra encima de lo que el usuario
  // pidió después.
  const email = useSendEmailConfirmation<PreparedQuoteEmail>({
    busyMutationKeys: [prepareQuoteEmailMutationKey, sendQuoteEmailMutationKey],
    prepare: prepareEmail.mutateAsync,
    send: sendEmail.mutate,
  });
  const downloadPdf = useDownloadQuotePdf();
  const submitForReview = useSubmitQuoteForReview();
  const review = useQuoteReviewValidationFlow();

  const onAction = async (action: QuoteRowAction, quote: Quote) => {
    switch (action) {
      case "view":
        dialogTurnRef.current++;
        email.invalidate();
        setDialog({ kind: "view", quote, openedAt: Date.now() });
        return;
      case "edit":
        router.push(`/sales/quotes/${quote.id}/edit`);
        return;
      case "sendEmail":
        // Cuenta como turno de diálogo: invalida un "Enviar a revisión" que
        // siga validando, igual que cualquier otro diálogo pedido después.
        dialogTurnRef.current++;
        email.request(quote.id);
        return;
      case "downloadPdf":
        downloadPdf.mutate(quote.id);
        return;
      case "authorize":
      case "reject":
        // Misma guarda de NEGOCIO que tenía la celda: fuera de un estatus
        // autorizable el diálogo no se abre (el ítem tampoco es visible).
        if (!canManageQuoteAuthorization(quote.estatus)) return;
        dialogTurnRef.current++;
        email.invalidate();
        setDialog({ kind: action, quote, openedAt: Date.now() });
        return;
      case "submitForReview": {
        const turn = ++dialogTurnRef.current;
        email.invalidate();
        const status = await review.validateBeforeSendToReview(quote.id);
        if (status === "valid" && turn === dialogTurnRef.current) {
          setDialog({ kind: "submitForReview", quote, openedAt: Date.now() });
        }
        return;
      }
    }
  };

  // El "en curso" se acota a la fila que lo disparó (el id es la `variable`
  // de cada mutación), igual que cuando los hooks vivían en la celda — ver
  // `usePendingQuoteIds` para por qué se lee de la caché y no de la instancia.
  const authorizing = usePendingQuoteIds(approveOperationsQuoteMutationKey);
  const isAuthorizeBusy = (quoteId: number) =>
    authorizing.includes(quoteId) || authorizeLock.isPending(quoteId);
  const rejecting = usePendingQuoteIds(rejectOperationsQuoteMutationKey);
  // Preparar ("Preparando…") y enviar ("Enviando…", solo tras confirmar) se
  // distinguen en el menú; las dos deshabilitan repetir la acción.
  const preparingEmail = usePendingQuoteIds(prepareQuoteEmailMutationKey);
  const sendingEmail = usePendingQuoteIds(sendQuoteEmailMutationKey);
  const downloadingPdf = usePendingQuoteIds(downloadQuotePdfMutationKey);
  const submittingForReview = usePendingQuoteIds(submitQuoteForReviewMutationKey);
  const validatingReview = usePendingQuoteIds(validateQuoteForReviewMutationKey);
  const busy: QuoteRowBusy[] = [
    ...authorizing.map((quoteId) => ({ kind: "authorize" as const, quoteId })),
    ...rejecting.map((quoteId) => ({ kind: "reject" as const, quoteId })),
    ...preparingEmail.map((quoteId) => ({ kind: "prepareEmail" as const, quoteId })),
    ...sendingEmail.map((quoteId) => ({ kind: "sendEmail" as const, quoteId })),
    ...downloadingPdf.map((quoteId) => ({ kind: "downloadPdf" as const, quoteId })),
    ...submittingForReview.map((quoteId) => ({ kind: "submitForReview" as const, quoteId })),
    ...validatingReview.map((quoteId) => ({ kind: "validateReview" as const, quoteId })),
  ];

  const dialogs = {
    dialog,
    onClose: () => setDialog(null),
    onAuthorize: (quoteId: number) => {
      // Ya en vuelo (doble clic, o reabrir tras cerrar mientras sigue
      // pendiente): no se vuelve a mandar.
      if (authorizing.includes(quoteId) || !authorizeLock.acquire(quoteId)) return;
      approveAsync(quoteId)
        // El hook ya avisó del error con su toast; aquí solo se evita el
        // rechazo no manejado de la promesa.
        .catch(() => {})
        .finally(() => {
          authorizeLock.release(quoteId);
          // Solo cierra SU confirmación: si el usuario ya abrió otra cosa, no
          // se toca.
          setDialog((current) =>
            current?.kind === "authorize" && current.quote.id === quoteId ? null : current
          );
        });
    },
    /**
     * Props de cierre bloqueado de la confirmación de autorizar
     * (`guardClose`): `busy` también con el "en curso" de la MutationCache,
     * que sobrevive a un remontaje de la vista.
     */
    authorizeGuard: (quoteId: number) =>
      authorizeLock.guardClose(quoteId, () => setDialog(null), authorizing.includes(quoteId)),
    isAuthorizeBusy,
    onSubmitForReview: (quoteId: number, comentario?: string) =>
      submitForReview.mutate({ id: quoteId, comentario }),
    emailDialog: email.dialog,
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
