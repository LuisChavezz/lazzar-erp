"use client";

import { useMemo } from "react";
import Link from "next/link";
import { compareAsc, isAfter, parseISO } from "date-fns";
import { GoogleCalendarIcon, ChevronRightIcon } from "@/src/components/Icons";
import { useGoogleCalendarEvents } from "../hooks/useGoogleCalendarEvents";
import { useGoogleCalendarStore } from "../stores/google-calendar.store";
import { EmptyUpcomingEvents } from "./EmptyUpcomingEvents";
import { EventItem } from "./EventItem";
import type { GoogleCalendarEvent } from "../interfaces/google.interface";

// --- Componente principal ---

/**
 * Panel lateral de próximos eventos de Google Calendar.
 *
 * Muestra hasta 5 eventos futuros ordenados por fecha. Al hacer clic
 * sobre un evento, lo selecciona en la store para visualizar su detalle.
 *
 * `hideViewAll` oculta el enlace "Ver todo": lo pasa `GoogleCalendar`, donde el
 * panel ya vive dentro del calendario completo (sea cual sea el módulo).
 */
export const GoogleUpcomingEvents = ({ hideViewAll = false }: { hideViewAll?: boolean }) => {
  const { data, isLoading } = useGoogleCalendarEvents();
  const selectedEventId = useGoogleCalendarStore((s) => s.selectedEventId);
  const setSelectedEventId = useGoogleCalendarStore((s) => s.setSelectedEventId);

  const upcomingEvents = useMemo<GoogleCalendarEvent[]>(() => {
    if (!data?.events) return [];
    const now = new Date();
    return data.events
      .filter((e) => e.status !== "cancelled" && isAfter(parseISO(e.start), now))
      .sort((a, b) => compareAsc(parseISO(a.start), parseISO(b.start)))
      .slice(0, 5);
  }, [data]);

  if (isLoading) {
    return (
      <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <GoogleCalendarIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Próximos eventos</h3>
          </div>
          {!hideViewAll && (
            <div className="w-16" aria-hidden="true">
              <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          )}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <GoogleCalendarIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Próximos eventos</h3>
        </div>
        {!hideViewAll && (
          <Link
            href="/sales/calendar"
            className="inline-flex items-center gap-0.5 text-[0.68rem] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
            aria-label="Ver calendario completo"
          >
            Ver todo
            <ChevronRightIcon className="w-3 h-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {upcomingEvents.length === 0 ? (
        <EmptyUpcomingEvents />
      ) : (
        <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6">
          {upcomingEvents.map((event, index) => (
            <EventItem
              key={event.id}
              event={event}
              index={index}
              isSelected={event.id === selectedEventId}
              onClick={setSelectedEventId}
            />
          ))}
        </div>
      )}
    </section>
  );
};
