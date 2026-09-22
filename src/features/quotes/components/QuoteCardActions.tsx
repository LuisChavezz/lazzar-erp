"use client";

import type { ReactNode } from "react";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import {
  CheckCircleIcon,
  DownloadIcon,
  EditIcon,
  EmailIcon,
  PaperPlaneIcon,
  RejectIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { isQuoteRowBusy, useQuoteRowActionsContext } from "../hooks/useQuoteRowActions";
import { Quote } from "../interfaces/quote.interface";
import {
  canEditQuote,
  canManageQuoteAuthorization,
  isQuoteReviewableStatus,
} from "../utils/quoteStatusRules";

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteCardActionsProps {
  quote: Quote;
  align?: "start" | "center" | "end";
  /** Ver `ActionMenu`: disparador personalizado en vez del botón "⋮" por defecto. */
  trigger?: ReactNode;
}

/**
 * Menú de acciones para una cotización.
 * Compartido entre el listado (QuoteColumns) y las cards del tablero kanban.
 *
 * Solo SEÑALA intención: no tiene mutaciones ni diálogos propios. Esos viven
 * en la vista (`useQuoteRowActions` + `QuoteRowActionDialogs`), porque un
 * diálogo dentro de la celda se desmontaba junto con ella cuando la fila
 * salía de la vista filtrada a media interacción (p. ej. al autorizarla con
 * un filtro de estatus activo). `onAction` y `busy` (trabajo en curso por
 * cotización, que acota etiquetas y `disabled` a ESTA fila) llegan por
 * contexto desde la vista dueña — ver `QuoteRowActionsProvider`.
 */
export function QuoteCardActions({ quote, align = "end", trigger }: QuoteCardActionsProps) {
  const { onAction, busy } = useQuoteRowActionsContext();
  const isAuthorizing = isQuoteRowBusy(busy, "authorize", quote.id);
  const isRejecting = isQuoteRowBusy(busy, "reject", quote.id);
  const isSendingEmail = isQuoteRowBusy(busy, "sendEmail", quote.id);
  const isDownloadingPdf = isQuoteRowBusy(busy, "downloadPdf", quote.id);
  const isSubmittingForReview = isQuoteRowBusy(busy, "submitForReview", quote.id);
  const isValidatingReview = isQuoteRowBusy(busy, "validateReview", quote.id);

  // ─── Permisos de acción por estatus ───────────────────────────────────────
  const canEdit = canEditQuote(quote.estatus);
  const canManageAuthorization = canManageQuoteAuthorization(quote.estatus);

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => onAction("view", quote),
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onAction("edit", quote),
      // `visible` es la regla de NEGOCIO (estatus editable, ver
      // `canEditQuote`); `permission` es la de PERMISOS — se exigen ambas.
      permission: "E-CRM-COTIZACIONES",
      visible: canEdit,
    },
    {
      label: isValidatingReview ? "Verificando..." : "Enviar a revisión",
      icon: PaperPlaneIcon,
      onSelect: () => onAction("submitForReview", quote),
      disabled: isSubmittingForReview || isValidatingReview,
      visible: isQuoteReviewableStatus(quote.estatus),
    },
    {
      label: isSendingEmail ? "Enviando..." : "Enviar correo",
      icon: EmailIcon,
      onSelect: () => onAction("sendEmail", quote),
      disabled: isSendingEmail || isAuthorizing || isRejecting || isDownloadingPdf,
      keepOpenOnSelect: true,
    },
    {
      label: isDownloadingPdf ? "Generando PDF..." : "Descargar PDF",
      icon: DownloadIcon,
      onSelect: () => onAction("downloadPdf", quote),
      disabled: isDownloadingPdf || isSendingEmail,
    },
    {
      // Autorizar/rechazar desde el tablero de Ventas es la misma capacidad de
      // Mesa de Control, con sus códigos propios del catálogo
      // (A-MESACONTROL-COTI / D-MESACONTROL-COTI). Sigue siendo un permiso de
      // OTRO módulo a propósito: quien aprueba es Mesa de Control.
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: () => onAction("authorize", quote),
      disabled: isAuthorizing || isRejecting || isSendingEmail,
      permission: "A-MESACONTROL-COTI",
      visible: canManageAuthorization,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: () => onAction("reject", quote),
      disabled: isRejecting || isAuthorizing || isSendingEmail,
      permission: "D-MESACONTROL-COTI",
      visible: canManageAuthorization,
    },
  ];

  return <ActionMenu items={items} ariaLabel="Acciones de cotización" align={align} trigger={trigger} />;
}
