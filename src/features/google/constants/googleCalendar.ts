import type { GoogleCalendarEvent } from "../interfaces/google.interface";

// --- Tipos ---

export type CalendarView = "dayGridMonth" | "timeGridDay";

// --- Opciones de vista del calendario ---

export const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "dayGridMonth", label: "Mes" },
  { value: "timeGridDay", label: "Día" },
];

// --- Formatos de hora para FullCalendar ---

export const EVENT_TIME_FORMAT = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
} as const;

export const DAY_VIEW_TIME_FORMAT = {
  hour: "numeric",
  minute: "2-digit",
  meridiem: false,
  omitZeroMinute: false,
} as const;

// --- Clasificación visual de eventos ---

/** Asigna clase CSS de color según el estado del evento de Google Calendar. */
export const getEventClass = (status: GoogleCalendarEvent["status"]): string => {
  if (status === "tentative") return "event-amber cursor-pointer";
  return "event-sky cursor-pointer";
};
