"use client";

import type { ReactNode } from "react";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { useCanActAsMesaControl } from "@/src/hooks/useCanActAsMesaControl";
import {
  MESA_CONTROL_AUTHORIZE_QUOTE_PERMISSION,
  MESA_CONTROL_REJECT_QUOTE_PERMISSION,
} from "@/src/constants/mesaControlActionPermissions";
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
  acceptsResendComment,
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
 * Menú de acciones para una cotización en las cards del tablero kanban; el
 * listado pinta las MISMAS acciones (`useQuoteActionItems`) desde su celda de
 * folio (`FolioActionMenu`).
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
  const items = useQuoteActionItems(quote);
  return <ActionMenu items={items} ariaLabel="Acciones de cotización" align={align} trigger={trigger} />;
}

/**
 * Acciones del menú de una cotización, con "Ver detalle" siempre primero.
 * Compartidas por el tablero (`QuoteCardActions`) y el listado
 * (`QuoteColumns`), para que ambas vistas ofrezcan exactamente lo mismo.
 */
export function useQuoteActionItems(quote: Quote): ActionMenuItem[] {
  const { onAction, busy } = useQuoteRowActionsContext();
  const isAuthorizing = isQuoteRowBusy(busy, "authorize", quote.id);
  const isRejecting = isQuoteRowBusy(busy, "reject", quote.id);
  const isSendingEmail = isQuoteRowBusy(busy, "sendEmail", quote.id);
  const isPreparingEmail = isQuoteRowBusy(busy, "prepareEmail", quote.id);
  const isDownloadingPdf = isQuoteRowBusy(busy, "downloadPdf", quote.id);
  const isSubmittingForReview = isQuoteRowBusy(busy, "submitForReview", quote.id);
  const isValidatingReview = isQuoteRowBusy(busy, "validateReview", quote.id);

  // ─── Permisos de acción por estatus ───────────────────────────────────────
  const canEdit = canEditQuote(quote.estatus);
  const canManageAuthorization = canManageQuoteAuthorization(quote.estatus);
  // Autorizar/rechazar llaman a los mismos endpoints de Mesa de Control
  // (`/ventas/mesa-control/{id}/autorizar|rechazar/`): misma regla (EC-943).
  const canApprove = useCanActAsMesaControl(MESA_CONTROL_AUTHORIZE_QUOTE_PERMISSION);
  const canReject = useCanActAsMesaControl(MESA_CONTROL_REJECT_QUOTE_PERMISSION);

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalle",
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
      label: isValidatingReview
        ? "Verificando..."
        : acceptsResendComment(quote.estatus)
          ? "Reenviar a revisión"
          : "Enviar a revisión",
      icon: PaperPlaneIcon,
      onSelect: () => onAction("submitForReview", quote),
      disabled: isSubmittingForReview || isValidatingReview,
      visible: isQuoteReviewableStatus(quote.estatus),
    },
    {
      label: isPreparingEmail
        ? "Preparando..."
        : isSendingEmail
          ? "Enviando..."
          : "Enviar correo",
      icon: EmailIcon,
      onSelect: () => onAction("sendEmail", quote),
      disabled:
        isPreparingEmail || isSendingEmail || isAuthorizing || isRejecting || isDownloadingPdf,
      keepOpenOnSelect: true,
    },
    {
      label: isDownloadingPdf ? "Generando PDF..." : "Descargar PDF",
      icon: DownloadIcon,
      onSelect: () => onAction("downloadPdf", quote),
      disabled: isDownloadingPdf || isPreparingEmail || isSendingEmail,
    },
    {
      // Autorizar/rechazar desde el tablero de Ventas es la misma capacidad de
      // Mesa de Control, y se decide igual que allí (`es_mesa_control`): quien
      // aprueba es Mesa de Control, no Ventas.
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: () => onAction("authorize", quote),
      disabled: isAuthorizing || isRejecting || isPreparingEmail || isSendingEmail,
      visible: canApprove && canManageAuthorization,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: () => onAction("reject", quote),
      disabled: isRejecting || isAuthorizing || isPreparingEmail || isSendingEmail,
      visible: canReject && canManageAuthorization,
    },
  ];

  return items;
}
