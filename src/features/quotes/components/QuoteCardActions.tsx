"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { QuoteDetailsLoadingSkeleton } from "./QuoteDetailsLoadingSkeleton";
import {
  CheckCircleIcon,
  DownloadIcon,
  EditIcon,
  EmailIcon,
  PaperPlaneIcon,
  RejectIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { useApproveOperationsQuote } from "../../operations/hooks/useApproveOperationsQuote";
import { useRejectOperationsQuote } from "../../operations/hooks/useRejectOperationsQuote";
import { useGoogleSendEmail } from "../../google/hooks/useGoogleSendEmail";
import { useDownloadQuotePdf } from "../hooks/useDownloadQuotePdf";
import { useSubmitQuoteForReview } from "../hooks/useSubmitQuoteForReview";
import { useQuoteReviewValidationFlow } from "../hooks/useQuoteReviewValidationFlow";
import { Quote } from "../interfaces/quote.interface";
import {
  canEditQuote,
  canManageQuoteAuthorization,
  canSubmitQuoteForReview,
} from "../utils/quoteStatusRules";
import { QuoteReviewValidationDialog } from "./QuoteReviewValidationDialog";

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

  const {
    mutate: authorizeOrder,
    isPending: isAuthorizingOrder,
  } = useApproveOperationsQuote();
  const { mutate: rejectOrder, isPending: isRejectingOrder } =
    useRejectOperationsQuote();
  const { mutate: sendQuoteEmail, isPending: isSendingQuoteEmail } = useGoogleSendEmail();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadQuotePdf();
  const { mutate: submitQuoteForReview, isPending: isSubmittingForReview } =
    useSubmitQuoteForReview();
  const {
    reviewValidationErrors,
    isReviewValidationDialogOpen,
    setIsReviewValidationDialogOpen,
    validationQuoteId,
    isValidatingReview,
    validateBeforeSendToReview,
  } = useQuoteReviewValidationFlow();

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

  const handleSubmitForReviewClick = async () => {
    const validationStatus = await validateBeforeSendToReview(quote.id);
    if (validationStatus === "valid") {
      setIsSubmitForReviewOpen(true);
    }
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
      label: isValidatingReview ? "Verificando..." : "Enviar a revisión",
      icon: PaperPlaneIcon,
      onSelect: handleSubmitForReviewClick,
      disabled: isSubmittingForReview || isValidatingReview,
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
      <QuoteReviewValidationDialog
        open={isReviewValidationDialogOpen}
        onOpenChange={setIsReviewValidationDialogOpen}
        quoteId={validationQuoteId ?? quote.id}
        errors={reviewValidationErrors}
      />
    </>
  );
}
