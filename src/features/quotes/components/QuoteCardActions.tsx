"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import {
  CheckCircleIcon,
  DownloadIcon,
  EmailIcon,
  RejectIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { useApproveQuote } from "../../operations/hooks/useApproveQuote";
import { useRejectQuote } from "../../operations/hooks/useRejectQuote";
import { useGoogleSendEmail } from "../../google/hooks/useGoogleSendEmail";
import { useDownloadQuotePdf } from "../hooks/useDownloadQuotePdf";
import { Quote } from "../interfaces/quote.interface";

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
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const { mutate: authorizeOrder, isPending: isAuthorizingOrder } = useApproveQuote();
  const { mutate: rejectOrder, isPending: isRejectingOrder } = useRejectQuote();
  const { mutate: sendQuoteEmail, isPending: isSendingQuoteEmail } = useGoogleSendEmail();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadQuotePdf();

  const canManageAuthorization = quote.estatus === 2;

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
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
      onSelect: () => setIsAuthorizeOpen(true),
      disabled: isAuthorizingOrder || isRejectingOrder,
      permission: "R-MESACONTROL",
      visible: canManageAuthorization,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: () => setIsRejectOpen(true),
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
        open={isAuthorizeOpen}
        onOpenChange={setIsAuthorizeOpen}
        title="Autorizar pedido"
        description={`¿Deseas autorizar el pedido #${quote.id}?`}
        confirmText={isAuthorizingOrder ? "Autorizando..." : "Autorizar"}
        confirmColor="blue"
        onConfirm={() => authorizeOrder(quote.id)}
      />
      <ConfirmDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Rechazar pedido"
        description={`¿Deseas rechazar el pedido #${quote.id}?`}
        confirmText={isRejectingOrder ? "Rechazando..." : "Rechazar"}
        confirmColor="red"
        onConfirm={() => rejectOrder(quote.id)}
      />
    </>
  );
}
