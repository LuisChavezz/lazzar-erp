"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Quote } from "../interfaces/quote.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { QuoteDetailsLoadingSkeleton } from "./QuoteDetailsLoadingSkeleton";
import {
  CheckCircleIcon,
  DownloadIcon,
  // EmbarquesIcon,
  EditIcon,
  EmailIcon,
  // FacturacionIcon,
  PaperPlaneIcon,
  RejectIcon,
  ViewIcon,
} from "../../../components/Icons";
import { formatCurrency } from "../../../utils/formatCurrency";
import { getStatusStyles } from "../utils/getStatusStyle";
import { formatQuoteDateTime } from "../utils/quoteDetailsFormatters";
import { useApproveOperationsQuote } from "../../operations/hooks/useApproveOperationsQuote";
import { useRejectOperationsQuote } from "../../operations/hooks/useRejectOperationsQuote";
import { useGoogleSendEmail } from "@/src/features/google/hooks/useGoogleSendEmail";
import { useDownloadQuotePdf } from "../hooks/useDownloadQuotePdf";
import { useSubmitQuoteForReview } from "../hooks/useSubmitQuoteForReview";
import { capitalize } from "@/src/utils/capitalize";
import {
  canEditQuote,
  canManageQuoteAuthorization,
  canSubmitQuoteForReview,
} from "../utils/quoteStatusRules";
import { type QuoteReviewValidationError } from "../utils/validateQuoteForReview";
import { QuoteReviewValidationDialog } from "./QuoteReviewValidationDialog";
import { useValidateQuoteForReview } from "../hooks/useValidateQuoteForReview";

const QuoteDetails = dynamic(
  () => import("./QuoteDetails").then((mod) => mod.QuoteDetails),
  {
    ssr: false,
    loading: () => (
      <QuoteDetailsLoadingSkeleton ariaLabel="Cargando detalle de cotización" />
    ),
  }
);

const statusDialogColors: Record<number, "sky" | "emerald" | "amber" | "rose"> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

const ActionsCell = ({ quote }: { quote: Quote }) => {
  const router = useRouter();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isSubmitForReviewOpen, setIsSubmitForReviewOpen] = useState(false);
  const [reviewValidationErrors, setReviewValidationErrors] = useState<QuoteReviewValidationError[]>([]);
  const [isReviewValidationDialogOpen, setIsReviewValidationDialogOpen] = useState(false);
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
    mutateAsync: validateQuoteBeforeReview,
    isPending: isValidatingReview,
  } = useValidateQuoteForReview();

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

  // ─── Validación previa al envío a revisión ────────────────────────────────
  const handleSubmitForReviewClick = async () => {
    try {
      setReviewValidationErrors([]);
      setIsReviewValidationDialogOpen(false);
      const errores = await validateQuoteBeforeReview(quote.id);
      if (errores.length > 0) {
        setReviewValidationErrors(errores);
        setIsReviewValidationDialogOpen(true);
      } else {
        setIsSubmitForReviewOpen(true);
      }
    } catch {
      return;
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
    <div className="flex items-center justify-center">
      <ActionMenu items={items} ariaLabel="Acciones de cotización" />
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
        quoteId={quote.id}
        errors={reviewValidationErrors}
      />
    </div>
  );
};

export const quoteColumns: ColumnDef<Quote>[] = [
  {
    accessorKey: "estatus_label",
    meta: { label: "Estado" },
    header: () => <div className="w-full text-center">Estado</div>,
    cell: ({ row }) => {
      const styles = getStatusStyles(row.original);
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            {capitalize(row.original.estatus_label)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "cliente_razon_social",
    meta: { label: "Razón social" },
    header: () => <div className="w-full text-center">Razón social</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-600 dark:text-slate-300">
        {capitalize(row.original.cliente_razon_social)}
      </span>
    ),
  },
  {
    id: "piezas",
    meta: { label: "Piezas" },
    header: () => <div className="w-full text-center">Piezas</div>,
    size: 80,
    cell: ({ row }) => (
      <span className="block text-center text-slate-500 dark:text-slate-400">
        {row.original.piezas}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    meta: { label: "Fecha" },
    header: () => <div className="w-full text-center">Fecha</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-600 dark:text-slate-300">
        {formatQuoteDateTime(row.original.created_at, "d MMM yyyy, HH:mm")}
      </span>
    ),
  },
  {
    id: "importeSinIva",
    accessorKey: "importe_sin_iva",
    meta: { label: "Importe sin IVA" },
    header: () => <div className="w-full text-center">Importe sin IVA</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-500 dark:text-slate-400">
        {formatCurrency(Number(row.original.importe_sin_iva) || 0)}
      </span>
    ),
  },
  {
    accessorKey: "gran_total",
    meta: { label: "Total" },
    header: () => <div className="w-full text-center">Total</div>,
    cell: ({ row }) => (
      <div className="text-center font-semibold text-slate-800 dark:text-slate-100">
        {formatCurrency(Number(row.original.gran_total) || 0)}
      </div>
    ),
  },
  {
    id: "actions",
    meta: { label: "Acciones" },
    header: () => <div className="text-center">Acciones</div>,
    size: 90,
    cell: ({ row }) => <ActionsCell quote={row.original} />,
  },
];
