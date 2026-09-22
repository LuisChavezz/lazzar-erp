"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { QuoteDetailsLoadingSkeleton } from "./QuoteDetailsLoadingSkeleton";
import { QuoteReviewValidationDialog } from "./QuoteReviewValidationDialog";
import type { Quote } from "../interfaces/quote.interface";
import type { QuoteRowActionDialogsState } from "../hooks/useQuoteRowActions";
import { canManageQuoteAuthorization } from "../utils/quoteStatusRules";

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

// ─── Colores del dialog de detalles por estatus ───────────────────────────────
const statusDialogColors: Record<number, "sky" | "emerald" | "amber" | "rose"> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

interface QuoteRowActionDialogsProps extends QuoteRowActionDialogsState {
  /**
   * Lista COMPLETA de la consulta (sin filtrar): el diálogo resuelve por id
   * la cotización viva, así sigue correcto aunque la fila haya salido de la
   * vista filtrada o cambiado de estatus mientras estaba abierto. Si el
   * registro ya no existe, usa la foto tomada al abrir.
   */
  quotes: Quote[];
}

/**
 * Diálogos de las acciones de fila de cotizaciones, montados UNA vez por
 * vista (listado y tablero) en lugar de una vez por celda. El estado y los
 * handlers vienen de `useQuoteRowActions`; el registro se resuelve aquí.
 */
export function QuoteRowActionDialogs({
  quotes,
  dialog,
  onClose,
  onAuthorize,
  onReject,
  onSubmitForReview,
  isAuthorizing,
  isRejecting,
  isSubmittingForReview,
  reviewValidation,
}: QuoteRowActionDialogsProps) {
  const quote = dialog
    ? (quotes.find((q) => q.id === dialog.quote.id) ?? dialog.quote)
    : null;
  const canManageAuthorization = quote ? canManageQuoteAuthorization(quote.estatus) : false;
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  // Si el estatus deja de ser autorizable con el diálogo de autorizar/rechazar
  // abierto, `open` pasa a false y el diálogo se oculta — pero Radix no avisa
  // por `onOpenChange` de un cambio de la prop controlada, así que el estado
  // se limpia aquí. Sin esto quedaba vivo y, si un refetch posterior volvía a
  // hacer autorizable la cotización, el diálogo reaparecía sin que nadie lo
  // pidiera.
  const authorizationLost =
    (dialog?.kind === "authorize" || dialog?.kind === "reject") && !canManageAuthorization;
  useEffect(() => {
    if (authorizationLost) onClose();
  }, [authorizationLost, onClose]);

  return (
    <>
      {dialog?.kind === "view" && quote && (
        <MainDialog
          key={`view-${quote.id}`}
          open
          onOpenChange={handleOpenChange}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles del pedido #${quote.id}`}
              subtitle={quote.cliente_nombre || quote.cliente_razon_social}
              statusColor={statusDialogColors[quote.estatus] ?? "sky"}
            />
          }
        >
          <QuoteDetails quoteId={quote.id} />
        </MainDialog>
      )}

      {/* Misma guarda que tenía la celda (`open && canManageAuthorization`):
          si el estatus deja de ser autorizable mientras está abierto, el
          diálogo se cierra en vez de disparar una acción inválida (y el
          efecto `authorizationLost` descarta su estado). */}
      {dialog?.kind === "authorize" && quote && (
        <ConfirmDialog
          key={`authorize-${quote.id}`}
          open={canManageAuthorization}
          onOpenChange={handleOpenChange}
          title="Autorizar pedido"
          description={`¿Deseas autorizar el pedido #${quote.id}?`}
          confirmText={isAuthorizing ? "Autorizando..." : "Autorizar"}
          confirmColor="blue"
          onConfirm={() => {
            if (canManageAuthorization) onAuthorize(quote.id);
          }}
        />
      )}
      {dialog?.kind === "reject" && quote && (
        <ConfirmDialog
          key={`reject-${quote.id}`}
          open={canManageAuthorization}
          onOpenChange={handleOpenChange}
          title="Rechazar pedido"
          description={`¿Deseas rechazar el pedido #${quote.id}?`}
          confirmText={isRejecting ? "Rechazando..." : "Rechazar"}
          confirmColor="red"
          onConfirm={() => {
            if (canManageAuthorization) onReject(quote.id);
          }}
        />
      )}
      {dialog?.kind === "submitForReview" && quote && (
        <ConfirmDialog
          key={`submit-${quote.id}`}
          open
          onOpenChange={handleOpenChange}
          title="Enviar a revisión"
          description={`Mientras la cotización #${quote.id} esté en revisión no podrá editarse. ¿Deseas continuar?`}
          confirmText={isSubmittingForReview ? "Enviando..." : "Enviar a revisión"}
          confirmColor="blue"
          onConfirm={() => onSubmitForReview(quote.id)}
        />
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
