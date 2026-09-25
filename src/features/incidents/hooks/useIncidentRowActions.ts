"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import type { Incident, ToggleIncidentActivoPayload } from "../interfaces/incident.interface";
import { toggleIncidentActivoMutationKey } from "./useToggleIncidentActivo";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`IncidentRowActionsMenu`) por contexto, NO por
// la factoría de columnas: si el id "en vuelo" viajara dentro de
// `getColumns(...)`, cada inicio y fin de un cambio de estatus crearía
// funciones `cell` nuevas y React remontaría TODAS las celdas (se cierra el
// menú abierto de otra fila, caducan las refs). Mismo patrón que
// `useTrainingRowActions`.

export interface IncidentRowActionsContextValue {
  onEdit: (incident: Incident) => void;
  onToggleActivo: (incident: Incident) => void;
}

const IncidentRowActionsContext = createContext<IncidentRowActionsContextValue | null>(null);

export const IncidentRowActionsProvider = IncidentRowActionsContext.Provider;

/** Para `IncidentRowActionsMenu`: exige estar bajo un `IncidentRowActionsProvider`. */
export function useIncidentRowActionsContext(): IncidentRowActionsContextValue {
  const value = useContext(IncidentRowActionsContext);
  if (!value) {
    throw new Error(
      "IncidentRowActionsMenu debe renderizarse dentro de un IncidentRowActionsProvider (ver IncidentList)."
    );
  }
  return value;
}

/**
 * Ids de incidencia con un cambio de estatus EN CURSO, leídos de la
 * `MutationCache` y no de la instancia de `useMutation`, que solo recuerda su
 * ÚLTIMA llamada. Mismo criterio que `usePendingTrainingDeleteIds`.
 */
export function usePendingIncidentToggleIds(): number[] {
  return useMutationState({
    filters: { mutationKey: [...toggleIncidentActivoMutationKey], status: "pending" },
    select: (mutation) => (mutation.state.variables as ToggleIncidentActivoPayload).id,
  });
}
