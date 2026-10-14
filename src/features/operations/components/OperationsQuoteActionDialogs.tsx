"use client";

import dynamic from "next/dynamic";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { MainDialog } from "@/src/components/MainDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import {
  canAcceptQuoteChanges as canAcceptOperationsQuoteChangesStatus,
  canManageQuoteAuthorization as canManageOperationsQuoteAuthorization,
} from "../../quotes/utils/quoteStatusRules";
import { QuoteDetailsLoadingSkeleton } from "../../quotes/components/QuoteDetailsLoadingSkeleton";
import { useAcceptChangesOperationsQuote } from "../hooks/useAcceptChangesOperationsQuote";
import { useApproveOperationsQuote } from "../hooks/useApproveOperationsQuote";
import { useRejectChangesOperationsQuote } from "../hooks/useRejectChangesOperationsQuote";
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
   * Listado completo de la consulta: solo para el color de estatus del
   * encabezado de "Ver detalles" (fila viva, o la foto si ya salió). La
   * elegibilidad de las acciones se evalúa sobre la foto, no aquí.
   */
  operationsQuotes: OperationsQuote[];
}

/**
 * Diálogos de las acciones de fila de Mesa de Control (ver detalles,
 * autorizar, rechazar, aceptar/rechazar cambios), montados UNA vez en la vista
 * en lugar de dentro de cada celda: una celda se desmonta al ordenar, paginar,
 * filtrar o cuando la acción saca la fila del listado, y se llevaba el diálogo.
 *
 * La copia del registro se toma al ABRIR (`useDialogSession`) y cada diálogo
 * queda montado con `open` controlado, así anima al cerrar. Cerrar por
 * cualquier vía (confirmar, cancelar, Esc) limpia `dialog`, así que la
 * siguiente acción de fila siempre es una transición cerrado → abierto.
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
  // Sin etiqueta de "en curso" en los diálogos: cierran al confirmar
  // (`closeOnConfirm`), así que nunca se pintaría. La retroalimentación es el
  // overlay de la tabla y el estado por fila (`OperationsQuoteList`).

  if (!snapshot || !operationsQuote) return null;

  // Elegibilidad SOLO sobre la foto tomada al abrir: un cambio de estatus en
  // la fila viva no oculta el diálogo (lo dejaba con `dialog` sin limpiar y
  // la siguiente acción de fila ya no abría nada). Si la cotización se movió
  // por debajo, la respuesta de error del backend es la fuente de verdad.
  const snapshotEstatus = snapshot.operationsQuote.estatus;
  const canAuthorizeOperationsQuote =
    canManageOperationsQuoteAuthorization(snapshotEstatus) && snapshotEstatus === 2;
  const canAcceptOperationsQuoteChanges = canAcceptOperationsQuoteChangesStatus(snapshotEstatus);
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
          confirmText="Autorizar"
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
          confirmText="Aceptar cambios"
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
          confirmText="Rechazar cambios"
          confirmColor="red"
          onConfirm={() => {
            if (!canAcceptOperationsQuoteChanges) return;
            rejectChangesOperationsQuote(id);
          }}
        />
      );
  }
}
