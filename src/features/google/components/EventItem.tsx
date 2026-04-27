"use client";

import { formatEventTime } from "../utils/formatEventTime";
import type { GoogleCalendarEvent } from "../interfaces/google.interface";

interface EventItemProps {
  event: GoogleCalendarEvent;
  index: number;
  isSelected: boolean;
  onClick: (id: string) => void;
}

/** Ítem individual de evento en el panel de próximos eventos de Google Calendar. */
export const EventItem = ({ event, index, isSelected, onClick }: EventItemProps) => {
  const dotClass = isSelected
    ? "bg-sky-500 ring-sky-200 dark:ring-sky-900/60"
    : index === 0
      ? "bg-sky-500"
      : "bg-slate-300 dark:bg-slate-600 group-hover:bg-sky-400 transition-colors";

  const accentClass =
    index === 0
      ? "text-sky-600 dark:text-sky-400"
      : "text-slate-400 dark:text-slate-500";

  const titleClass = isSelected
    ? "font-bold text-sky-600 dark:text-sky-400"
    : index === 0
      ? "font-bold text-slate-800 dark:text-white group-hover:text-sky-500 transition-colors"
      : "font-medium text-slate-700 dark:text-slate-300 group-hover:text-sky-500 transition-colors";

  return (
    <button
      type="button"
      onClick={() => onClick(event.id)}
      className="relative group w-full text-left cursor-pointer"
      aria-pressed={isSelected}
    >
      <div
        className={`absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-black ${dotClass}`}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-0.5">
        <span className={`text-xs font-semibold ${accentClass}`}>
          {formatEventTime(event.start)}
        </span>
        <h4 className={`text-sm ${titleClass}`}>{event.summary}</h4>
        {event.location ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-55">
            {event.location}
          </p>
        ) : null}
      </div>
    </button>
  );
};
