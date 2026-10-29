"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Calendar } from "../interfaces/calendar.interface";
import { deleteCalendarMutationKey } from "./useDeleteCalendar";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`CalendarDateCell`) por contexto, NO por la
// factoría de columnas: si el "en vuelo" viajara dentro de `getColumns(...)`,
// cada inicio y fin de una acción crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas. Mismo patrón que `useEmployeeRowActions`.

export interface CalendarRowActionsContextValue {
  onEdit: (calendar: Calendar) => void;
  onDelete: (calendar: Calendar) => void;
  /** Ids con un borrado en vuelo (`usePendingCalendarIds`, calculado en la lista). */
  busyIds: number[];
}

const CalendarRowActionsContext = createContext<CalendarRowActionsContextValue | null>(null);

export const CalendarRowActionsProvider = CalendarRowActionsContext.Provider;

/** Para `CalendarDateCell`: exige estar bajo un `CalendarRowActionsProvider`. */
export function useCalendarRowActionsContext(): CalendarRowActionsContextValue {
  const value = useContext(CalendarRowActionsContext);
  if (!value) {
    throw new Error(
      "CalendarDateCell debe renderizarse dentro de un CalendarRowActionsProvider (ver CalendarList)."
    );
  }
  return value;
}

/**
 * Ids de día con un borrado EN CURSO, leídos de la `MutationCache` y no del
 * `useMutation`, que solo recuerda su ÚLTIMA llamada. Una sola suscripción, en
 * `CalendarList`; llega a cada menú por el contexto.
 */
export function usePendingCalendarIds(): number[] {
  return useMutationState({
    filters: { status: "pending", mutationKey: deleteCalendarMutationKey },
    select: selectMutationRecordId,
  });
}
