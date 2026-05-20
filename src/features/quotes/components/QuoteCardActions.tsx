"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import {
  CheckCircleIcon,
  DownloadIcon,
  EditIcon,
  EmailIcon,
  PaperPlaneIcon,
  RejectIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { useApproveQuote } from "../../operations/hooks/useApproveQuote";
import { useRejectQuote } from "../../operations/hooks/useRejectQuote";
import { useGoogleSendEmail } from "../../google/hooks/useGoogleSendEmail";
import { useDownloadQuotePdf } from "../hooks/useDownloadQuotePdf";
import { useSubmitQuoteForReview } from "../hooks/useSubmitQuoteForReview";
import { Quote } from "../interfaces/quote.interface";
import {
  canEditQuote,
  canManageQuoteAuthorization,
  canSubmitQuoteForReview,
} from "../utils/quoteStatusRules";

// ─── Carga diferida del panel de detalles ─────────────────────────────────────
const QuoteDetails = dynamic(
  () => import("./QuoteDetails").then((mod) => mod.QuoteDetails),
  {
    ssr: false,
    loading: () => (
      <div
        className="space-y-3"
        role="status"
        aria-live="polite"
        aria-label="Cargando detalle de cotización"
      >
        <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
      </div>
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteCardActionsProps {
  quote: Quote;
  align?: "start" | "center" | "end";
}

/**
 * Menú de acciones para una cotización.
 * Compartido entre el listado (QuoteColumns) y las cards del tablero kanban.
 */
export function QuoteCardActions({ quote, align = "end" }: QuoteCardActionsProps) {
  const router = useRouter();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isSubmitForReviewOpen, setIsSubmitForReviewOpen] = useState(false);

  const { mutate: authorizeOrder, isPending: isAuthorizingOrder } = useApproveQuote();
  const { mutate: rejectOrder, isPending: isRejectingOrder } = useRejectQuote();
  const { mutate: sendQuoteEmail, isPending: isSendingQuoteEmail } = useGoogleSendEmail();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadQuotePdf();
  const { mutate: submitQuoteForReview, isPending: isSubmittingForReview } =
    useSubmitQuoteForReview();

  // ─── Permisos de acción por estatus ───────────────────────────────────────
  const canEdit = canEditQuote(quote.estatus);
  const canSendToReview = canSubmitQuoteForReview(quote.estatus);
  const canManageAuthorization = canManageQuoteAuthorization(quote.estatus);

  const handleOpenAuthorizeDialog = () => {
    if (!canManageAuthorization) return;
    setIsAuthorizeOpen(true);
  };

  const handleOpenRejectDialog = () => {
    if (!canManageAuthorization) return;
    setIsRejectOpen(true);
  };

  const handleAuthorize = () => {
    if (!canManageAuthorization) return;
    authorizeOrder(quote.id);
  };

  const handleReject = () => {
    if (!canManageAuthorization) return;
    rejectOrder(quote.id);
  };

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => router.push(`/sales/quotes/${quote.id}/edit`),
      visible: canEdit,
    },
    {
      label: "Enviar a revisión",
      icon: PaperPlaneIcon,
      onSelect: () => setIsSubmitForReviewOpen(true),
      disabled: isSubmittingForReview,
      visible: canSendToReview,
    },
    {
      label: "Enviar correo",
      icon: EmailIcon,
      onSelect: () => sendQuoteEmail(quote.id),
      disabled: isSendingQuoteEmail || isAuthorizingOrder || isRejectingOrder,
    },
    {
      label: isDownloadingPdf ? "Generando PDF..." : "Descargar PDF",
      icon: DownloadIcon,
      onSelect: () => downloadPdf(quote.id),
      disabled: isDownloadingPdf,
    },
    {
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: handleOpenAuthorizeDialog,
      disabled: isAuthorizingOrder || isRejectingOrder,
      permission: "R-MESACONTROL",
      visible: canManageAuthorization,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: handleOpenRejectDialog,
      disabled: isRejectingOrder || isAuthorizingOrder,
      permission: "R-MESACONTROL",
      visible: canManageAuthorization,
    },
  ];

  return (
    <>
      <ActionMenu items={items} ariaLabel="Acciones de cotización" align={align} />

      {isViewOpen && (
        <MainDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
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

      <ConfirmDialog
        open={isAuthorizeOpen && canManageAuthorization}
        onOpenChange={setIsAuthorizeOpen}
        title="Autorizar pedido"
        description={`¿Deseas autorizar el pedido #${quote.id}?`}
        confirmText={isAuthorizingOrder ? "Autorizando..." : "Autorizar"}
        confirmColor="blue"
        onConfirm={handleAuthorize}
      />
      <ConfirmDialog
        open={isRejectOpen && canManageAuthorization}
        onOpenChange={setIsRejectOpen}
        title="Rechazar pedido"
        description={`¿Deseas rechazar el pedido #${quote.id}?`}
        confirmText={isRejectingOrder ? "Rechazando..." : "Rechazar"}
        confirmColor="red"
        onConfirm={handleReject}
      />
      <ConfirmDialog
        open={isSubmitForReviewOpen}
        onOpenChange={setIsSubmitForReviewOpen}
        title="Enviar a revisión"
        description={`Mientras la cotización #${quote.id} esté en revisión no podrá editarse. ¿Deseas continuar?`}
        confirmText={isSubmittingForReview ? "Enviando..." : "Enviar a revisión"}
        confirmColor="blue"
        onConfirm={() => submitQuoteForReview(quote.id)}
      />
    </>
  );
}
