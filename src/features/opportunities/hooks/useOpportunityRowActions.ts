"use client";

import { createContext, useContext } from "react";
import type { Opportunity } from "../interfaces/opportunity.interface";

// Los callbacks llegan al menú de fila por contexto, NO por la factoría de
// columnas: así las columnas no cambian de identidad y las celdas no se
// remontan. Mismo patrón que `useVacationRowActions`.
//
// Reciben el REGISTRO completo y la lista lo guarda tal cual (no solo su id):
// en modo servidor la tabla solo tiene una página, así que un diálogo no puede
// resolver su registro contra "el listado" si la fila sale de la vista.

export interface OpportunityRowActionsContextValue {
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunity: Opportunity) => void;
}

const OpportunityRowActionsContext = createContext<OpportunityRowActionsContextValue | null>(null);

export const OpportunityRowActionsProvider = OpportunityRowActionsContext.Provider;

export function useOpportunityRowActionsContext(): OpportunityRowActionsContextValue {
  const value = useContext(OpportunityRowActionsContext);
  if (!value) {
    throw new Error(
      "El menú de fila de oportunidades debe renderizarse dentro de un OpportunityRowActionsProvider (ver OpportunityList)."
    );
  }
  return value;
}
