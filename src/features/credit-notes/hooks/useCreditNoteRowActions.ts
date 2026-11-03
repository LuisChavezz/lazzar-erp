"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { FinanceWriteAccess } from "@/src/utils/financeWritePermission";

export interface CreditNoteRowActionsContextValue {
  /** Abre el detalle. Los diálogos viven en `CreditNoteList`, no en la celda. */
  onViewDetail: (id: number) => void;
  onEmitir: (id: number) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
  /**
   * Permiso de escritura de Finanzas (`useFinanceWriteAccess`). Sin él
   * (`denied`), "Emitir nota", "Cancelar nota" y "Eliminar borrador" se
   * muestran deshabilitados con su motivo; mientras la sesión carga
   * (`loading`), deshabilitados sin motivo.
   */
  writeAccess: FinanceWriteAccess;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<CreditNoteRowActionsContextValue>("CreditNoteFolioCell", "CreditNoteList");

/** Callbacks del menú de fila (`CreditNoteColumns`); ver `createRowActionsContext`. */
export const CreditNoteRowActionsProvider = Provider;
export const useCreditNoteRowActionsContext = useRowActionsContext;
