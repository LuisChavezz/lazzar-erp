"use client";

import dynamic from "next/dynamic";
import { useIsMutating } from "@tanstack/react-query";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { MainDialog } from "@/src/components/MainDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import {
  canAcceptQuoteChanges as canAcceptOperationsQuoteChangesStatus,
  canManageQuoteAuthorization as canManageOperationsQuoteAuthorization,
} from "../../quotes/utils/quoteStatusRules";
import { QuoteDetailsLoadingSkeleton } from "../../quotes/components/QuoteDetailsLoadingSkeleton";
import {
  acceptChangesOperationsQuoteMutationKey,
  useAcceptChangesOperationsQuote,
} from "../hooks/useAcceptChangesOperationsQuote";
import {
  approveOperationsQuoteMutationKey,
  useApproveOperationsQuote,
} from "../hooks/useApproveOperationsQuote";
import {
  rejectChangesOperationsQuoteMutationKey,
  useRejectChangesOperationsQuote,
} from "../hooks/useRejectChangesOperationsQuote";
import type { OperationsQuote } from "../interfaces/operations-quote.interface";
import type { OperationsQuoteRowAction } from "./OperationsQuoteColumns";
import { RejectQuoteDialog } from "./RejectQuoteDialog";

const OperationsQuoteDetails = dynamic(
  () =>
    import("../../quotes/components/QuoteDetails").then(
      (mod) => mod.QuoteDetails
    ),
  {
    ssr: false,
    loading: () => (
      <QuoteDetailsLoadingSkeleton ariaLabel="Cargando detalle de cotización operativa" />
    ),
  }
);

const operationsQuoteStatusDialogColors: Record<
  number,
  "sky" | "emerald" | "amber" | "rose" | "orange"
> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
  5: "orange",
};

export interface OperationsQuoteDialogState {
  kind: OperationsQuoteRowAction;
  /** La fila tal como estaba al pedir la acción. */
  operationsQuote: OperationsQuote;
}

interface OperationsQuoteActionDialogsProps {
  dialog: OperationsQuoteDialogState | null;
  onClose: () => void;
  /**
   * Listado completo de la consulta: autorizar y aceptar/rechazar cambios
   * conservan la guarda de estatus que tenían en la celda, evaluada sobre la
   * fila VIVA (o sobre la foto si ya salió del listado).
   */
  operationsQuotes: OperationsQuote[];
}

/** ¿Hay una mutación `mutationKey` en curso sobre esta cotización? */
function useIsMutatingQuote(mutationKey: readonly unknown[], quoteId: number | undefined) {
  return (
    useIsMutating({
      mutationKey: [...mutationKey],
      predicate: (mutation) => selectMutationRecordId(mutation) === quoteId,
    }) > 0
  );
}

/**
 * Diálogos de las acciones de fila de Mesa de Control (ver detalles,
 * autorizar, rechazar, aceptar/rechazar cambios), montados UNA vez en la vista
 * en lugar de dentro de cada celda: una celda se desmonta al ordenar, paginar,
 * filtrar o cuando la acción saca la fila del listado, y se llevaba el diálogo.
 *
 * La copia del registro se toma al ABRIR (`useDialogSession`) y cada diálogo
 * queda montado con `open` controlado, así anima al cerrar. Mismo
 * comportamiento, textos y guardas que tenían en la celda.
 */
export function OperationsQuoteActionDialogs({
  dialog,
  onClose,
  operationsQuotes,
}: OperationsQuoteActionDialogsProps) {
  const session = useDialogSession(dialog !== null, dialog);
  const snapshot = session.snapshot;
  const operationsQuote = snapshot
    ? (operationsQuotes.find((row) => row.id === snapshot.operationsQuote.id) ??
      snapshot.operationsQuote)
    : null;

  const { mutate: authorizeOperationsQuote } = useApproveOperationsQuote();
  const { mutate: acceptChangesOperationsQuote } = useAcceptChangesOperationsQuote();
  const { mutate: rejectChangesOperationsQuote } = useRejectChangesOperationsQuote();
  const isAuthorizingOperationsQuote = useIsMutatingQuote(
    approveOperationsQuoteMutationKey,
    operationsQuote?.id
  );
  const isAcceptingChangesOperationsQuote = useIsMutatingQuote(
    acceptChangesOperationsQuoteMutationKey,
    operationsQuote?.id
  );
  const isRejectingChangesOperationsQuote = useIsMutatingQuote(
    rejectChangesOperationsQuoteMutationKey,
    operationsQuote?.id
  );

  if (!snapshot || !operationsQuote) return null;

  const canAuthorizeOperationsQuote =
    canManageOperationsQuoteAuthorization(operationsQuote.estatus) &&
    operationsQuote.estatus === 2;
  const canAcceptOperationsQuoteChanges = canAcceptOperationsQuoteChangesStatus(
    operationsQuote.estatus
  );
  const isOpen = (kind: OperationsQuoteRowAction) => dialog?.kind === kind;
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  const { id } = snapshot.operationsQuote;

  switch (snapshot.kind) {
    case "view":
      return (
        <MainDialog
          key={session.id}
          open={isOpen("view")}
          onOpenChange={handleOpenChange}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles de la cotización #${id}`}
              subtitle={
                snapshot.operationsQuote.cliente_nombre ||
                snapshot.operationsQuote.cliente_razon_social
              }
              statusColor={
                operationsQuoteStatusDialogColors[operationsQuote.estatus] ??
                "sky"
              }
            />
          }
        >
          <OperationsQuoteDetails quoteId={id} source="mesa-control" />
        </MainDialog>
      );
    case "authorize":
      return (
        <ConfirmDialog
          key={session.id}
          open={isOpen("authorize") && canAuthorizeOperationsQuote}
          onOpenChange={handleOpenChange}
          title="Autorizar cotización operativa"
          description={`¿Deseas autorizar la cotización #${id}?`}
          confirmText={
            isAuthorizingOperationsQuote ? "Autorizando..." : "Autorizar"
          }
          confirmColor="blue"
          onConfirm={() => {
            if (!canAuthorizeOperationsQuote) return;
            authorizeOperationsQuote(id);
          }}
        />
      );
    case "reject":
      return (
        <RejectQuoteDialog
          key={session.id}
          open={isOpen("reject")}
          quote={snapshot.operationsQuote}
          onClose={onClose}
        />
      );
    case "acceptChanges":
      return (
        <ConfirmDialog
          key={session.id}
          open={isOpen("acceptChanges") && canAcceptOperationsQuoteChanges}
          onOpenChange={handleOpenChange}
          title="Aceptar cambios de la cotización operativa"
          description={`¿Deseas aceptar los cambios de la cotización #${id}?`}
          confirmText={
            isAcceptingChangesOperationsQuote ? "Aplicando..." : "Aceptar cambios"
          }
          confirmColor="green"
          onConfirm={() => {
            if (!canAcceptOperationsQuoteChanges) return;
            acceptChangesOperationsQuote(id);
          }}
        />
      );
    case "rejectChanges":
      return (
        <ConfirmDialog
          key={session.id}
          open={isOpen("rejectChanges") && canAcceptOperationsQuoteChanges}
          onOpenChange={handleOpenChange}
          title="Rechazar cambios de la cotización operativa"
          description={`¿Deseas rechazar los cambios de la cotización #${id}?`}
          confirmText={
            isRejectingChangesOperationsQuote ? "Rechazando..." : "Rechazar cambios"
          }
          confirmColor="red"
          onConfirm={() => {
            if (!canAcceptOperationsQuoteChanges) return;
            rejectChangesOperationsQuote(id);
          }}
        />
      );
  }
}
