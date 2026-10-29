"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Calendar } from "../interfaces/calendar.interface";
import { deleteCalendarMutationKey } from "./useDeleteCalendar";

export interface CalendarRowActionsContextValue {
  onEdit: (calendar: Calendar) => void;
  onDelete: (calendar: Calendar) => void;
  /** Ids con un borrado en vuelo (`usePendingCalendarIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<CalendarRowActionsContextValue>(
  "CalendarDateCell",
  "CalendarList"
);

/** Callbacks y "en vuelo" del menú de fila (`CalendarDateCell`); ver `createRowActionsContext`. */
export const CalendarRowActionsProvider = Provider;
export const useCalendarRowActionsContext = useRowActionsContext;

/** Ids de día con un borrado en curso. Una sola suscripción, en `CalendarList`. */
export const usePendingCalendarIds = () => usePendingRecordIds(deleteCalendarMutationKey);
