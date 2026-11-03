"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";

export interface CreditNoteRowActionsContextValue {
  /** Abre el detalle. Los diálogos viven en `CreditNoteList`, no en la celda. */
  onViewDetail: (id: number) => void;
  onEmitir: (id: number) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
  /**
   * ¿El usuario puede emitir notas? (`canEmitCreditNote`). Sin el permiso,
   * "Emitir nota" se muestra deshabilitado con su motivo.
   */
  canEmit: boolean;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<CreditNoteRowActionsContextValue>("CreditNoteFolioCell", "CreditNoteList");

/** Callbacks del menú de fila (`CreditNoteColumns`); ver `createRowActionsContext`. */
export const CreditNoteRowActionsProvider = Provider;
export const useCreditNoteRowActionsContext = useRowActionsContext;
