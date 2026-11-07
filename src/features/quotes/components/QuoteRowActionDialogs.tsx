"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { MainDialog } from "@/src/components/MainDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { QuoteDetailsLoadingSkeleton } from "./QuoteDetailsLoadingSkeleton";
import { QuoteReviewValidationDialog } from "./QuoteReviewValidationDialog";
import { QuoteSendEmailConfirmDialog } from "./QuoteSendEmailConfirmDialog";
import { QuoteSubmitForReviewDialog } from "./QuoteSubmitForReviewDialog";
import { RejectQuoteDialog } from "../../operations/components/RejectQuoteDialog";
import type { Quote } from "../interfaces/quote.interface";
import type { QuoteRowActionDialogsState } from "../hooks/useQuoteRowActions";
import { useLiveQuoteStatus } from "../hooks/useLiveQuoteStatus";
import { canManageQuoteAuthorization } from "../utils/quoteStatusRules";
import { getQuoteDialogStatusColor } from "../constants/quoteStatus";
import { DIALOG_WIDTH_DETAIL } from "@/src/constants/dialogWidths";

// ─── Carga diferida del panel de detalles ─────────────────────────────────────
const QuoteDetails = dynamic(
  () => import("./QuoteDetails").then((mod) => mod.QuoteDetails),
  {
    ssr: false,
    loading: () => (
      <QuoteDetailsLoadingSkeleton ariaLabel="Cargando detalle de cotización" />
    ),
  }
);

interface QuoteRowActionDialogsProps extends QuoteRowActionDialogsState {
  /**
   * Filas que la vista tiene CARGADAS (la página del listado, las columnas
   * del tablero). Ya no son todas las cotizaciones: que una fila no esté aquí
   * NO significa que cambió de estatus (ver `useLiveQuoteStatus`).
   */
  loadedRows: readonly Quote[];
}

/**
 * Diálogos de las acciones de fila de cotizaciones, montados UNA vez por
 * vista (listado y tablero) en lugar de una vez por celda. El estado y los
 * handlers vienen de `useQuoteRowActions`; el registro se resuelve aquí.
 */
export function QuoteRowActionDialogs({
  loadedRows,
  dialog,
  onClose,
  onAuthorize,
  authorizeGuard,
  isAuthorizeBusy,
  onSubmitForReview,
  emailDialog,
  isSubmittingForReview,
  reviewValidation,
}: QuoteRowActionDialogsProps) {
  // Estatus VIVO: lo cargado por la vista y, para autorizar y rechazar (los
  // que dependen de que siga "Por autorizar"), el detalle leído al abrir. Sin
  // cambio en ninguno, la foto. `null`: ya no existe o ya no es visible.
  const checksStatus = dialog?.kind === "authorize" || dialog?.kind === "reject";
  const liveStatus = useLiveQuoteStatus(dialog, loadedRows, checksStatus);
  const quote = dialog
    ? { ...dialog.quote, estatus: liveStatus?.estatus ?? dialog.quote.estatus }
    : null;
  const canManageAuthorization =
    quote && liveStatus !== null ? canManageQuoteAuthorization(quote.estatus) : false;
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  // Si el estatus deja de ser autorizable con el diálogo de autorizar
  // abierto, `open` pasa a false y el diálogo se oculta — pero Radix no avisa
  // por `onOpenChange` de un cambio de la prop controlada, así que el estado
  // se limpia aquí. Sin esto quedaba vivo y, si un refetch posterior volvía a
  // hacer autorizable la cotización, el diálogo reaparecía sin que nadie lo
  // pidiera.
  // Solo AUTORIZAR: el rechazo hace su propia verificación (ver abajo).
  // Mientras la autorización PROPIA está en vuelo no se decide: la cierra el
  // `finally` de `onAuthorize` cuando termina, con su toast.
  const authorizeBusy = dialog?.kind === "authorize" && isAuthorizeBusy(dialog.quote.id);
  const authorizationLost =
    dialog?.kind === "authorize" && !canManageAuthorization && !authorizeBusy;
  useEffect(() => {
    if (authorizationLost) onClose();
  }, [authorizationLost, onClose]);

  // Rechazo: copia tomada al ABRIR (la fila del menú) para el texto, y
  // diálogo siempre montado con `open` controlado para que anime al cerrar.
  // Si el estatus vivo deja de ser "Por autorizar" mientras está abierto, el
  // diálogo se cierra con aviso (`liveQuote`); "ya no existe" solo lo dice el
  // detalle (404/403), nunca que la fila haya salido de la página. Lo que
  // ninguna fuente ve todavía lo decide el 400 `cotizacion` del backend.
  const isRejectOpen = dialog?.kind === "reject";
  const rejectSession = useDialogSession(isRejectOpen, isRejectOpen ? dialog.quote : null);

  return (
    <>
      {dialog?.kind === "view" && quote && (
        <MainDialog
          key={`view-${quote.id}`}
          open
          onOpenChange={handleOpenChange}
          maxWidth={DIALOG_WIDTH_DETAIL}
          title={
            <DialogHeader
              title={`Detalles de la cotización #${quote.id}`}
              subtitle={quote.cliente_nombre || quote.cliente_razon_social || "Sin cliente"}
              statusColor={getQuoteDialogStatusColor(quote.estatus)}
            />
          }
        >
          <QuoteDetails quoteId={quote.id} source="cotizaciones" />
        </MainDialog>
      )}

      {/* Misma guarda que tenía la celda (`open && canManageAuthorization`):
          si el estatus deja de ser autorizable mientras está abierto, el
          diálogo se cierra en vez de disparar una acción inválida (y el
          efecto `authorizationLost` descarta su estado). */}
      {dialog?.kind === "authorize" && quote && (
        <ConfirmDialog
          key={`authorize-${quote.id}`}
          open={canManageAuthorization || authorizeBusy}
          // En vuelo queda abierta y bloqueada (ver `authorizeGuard`); la
          // cierra `onAuthorize` al terminar.
          {...authorizeGuard(quote.id)}
          closeOnConfirm={false}
          title="Autorizar pedido"
          description={`¿Deseas autorizar el pedido #${quote.id}?`}
          confirmText={authorizeBusy ? "Autorizando..." : "Autorizar"}
          confirmColor="blue"
          onConfirm={() => {
            if (canManageAuthorization) onAuthorize(quote.id);
          }}
        />
      )}
      {rejectSession.snapshot && (
        <RejectQuoteDialog
          key={rejectSession.id}
          open={isRejectOpen}
          quote={rejectSession.snapshot}
          // Estatus vivo (ver arriba); con otro diálogo ya abierto, el de la
          // foto: este solo anima su cierre.
          liveQuote={
            isRejectOpen && liveStatus !== undefined
              ? liveStatus
              : { estatus: rejectSession.snapshot.estatus }
          }
          onClose={onClose}
        />
      )}
      {/* El estatus que decide si se ofrece el comentario es el de la FOTO al
          abrir, para que el diálogo no cambie de forma a media captura. */}
      {dialog?.kind === "submitForReview" && quote && (
        <QuoteSubmitForReviewDialog
          key={`submit-${quote.id}`}
          open
          onOpenChange={handleOpenChange}
          quoteId={quote.id}
          estatus={dialog.quote.estatus}
          description={`Mientras la cotización #${quote.id} esté en revisión no podrá editarse. ¿Deseas continuar?`}
          confirmText={isSubmittingForReview ? "Enviando..." : "Enviar a revisión"}
          onConfirm={(comentario) => onSubmitForReview(quote.id, comentario)}
        />
      )}

      {/* El correo mostrado es la foto preparada al pedir el envío
          (`useDialogSession`: sobrevive a la animación de cierre), y es
          exactamente lo que se envía al confirmar. */}
      {emailDialog && (
        <QuoteSendEmailConfirmDialog key={emailDialog.sessionId} {...emailDialog.props} />
      )}

      {reviewValidation.quoteId !== null && (
        <QuoteReviewValidationDialog
          open={reviewValidation.open}
          onOpenChange={reviewValidation.onOpenChange}
          quoteId={reviewValidation.quoteId}
          errors={reviewValidation.errors}
        />
      )}
    </>
  );
}
