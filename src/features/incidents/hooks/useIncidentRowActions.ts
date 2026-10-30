"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Incident } from "../interfaces/incident.interface";
import { toggleIncidentActivoMutationKey } from "./useToggleIncidentActivo";

/**
 * Todos reciben la incidencia y el padre guarda solo su id: el diálogo se
 * resuelve contra el listado completo, porque el toggle cambia `activo` —justo
 * el filtro del nombre— y la fila puede salir de la vista a mitad de la
 * interacción.
 */
export interface IncidentRowActionsContextValue {
  onEdit: (incident: Incident) => void;
  onToggleActivo: (incident: Incident) => void;
  /** Ids con un cambio de registro en vuelo (`usePendingIncidentIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<IncidentRowActionsContextValue>(
  "IncidentNameCell",
  "IncidentList"
);

/** Callbacks y "en vuelo" del menú de fila (`IncidentNameCell`); ver `createRowActionsContext`. */
export const IncidentRowActionsProvider = Provider;
export const useIncidentRowActionsContext = useRowActionsContext;

/** Ids de incidencia con una baja o reactivación en curso. Una sola suscripción, en `IncidentList`. */
export const usePendingIncidentIds = () => usePendingRecordIds(toggleIncidentActivoMutationKey);
