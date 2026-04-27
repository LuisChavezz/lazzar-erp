"use client";

import { useMemo } from "react";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLinkIcon, MapPinIcon, ClockIcon } from "@/src/components/Icons";
import { useGoogleCalendarEvents } from "../hooks/useGoogleCalendarEvents";
import { useGoogleCalendarStore } from "../stores/google-calendar.store";

// --- Utilidades ---

/**
 * Detecta si un string ISO representa un evento de todo el día.
 * Google Calendar devuelve "YYYY-MM-DD" (sin componente de hora) para estos eventos.
 */
const isAllDay = (isoString: string): boolean => !isoString.includes("T");

/** Genera el rango de fecha/hora legible de un evento de Google Calendar. */
const formatEventDateRange = (startIso: string, endIso: string): string => {
  const start = parseISO(startIso);
  if (!isValid(start)) return "Fecha inválida";

  const dayStr = format(start, "EEEE d 'de' MMMM yyyy", { locale: es });
  const startLabel = `${dayStr.charAt(0).toUpperCase()}${dayStr.slice(1)}`;

  // Para eventos de todo el día, no mostrar hora.
  if (isAllDay(startIso)) return startLabel;

  const startTime = format(start, "HH:mm");

  const end = parseISO(endIso);
  if (!isValid(end) || isAllDay(endIso)) return `${startLabel} · ${startTime}`;

  const endTime = format(end, "HH:mm");
  return `${startLabel} · ${startTime}–${endTime}`;
};

// --- Etiqueta de estado ---

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  confirmed: {
    label: "Confirmado",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  },
  tentative: {
    label: "Tentativo",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  },
};

// --- Componente principal ---

/**
 * Panel de detalle de un evento de Google Calendar.
 *
 * Se renderiza condicionalmente cuando hay un evento seleccionado en la store.
 * Muestra título, fecha, ubicación, descripción y un botón para abrir el
 * evento en Google Calendar en una nueva pestaña.
 */
export const GoogleEventDetails = () => {
  const selectedEventId = useGoogleCalendarStore((s) => s.selectedEventId);
  const { data } = useGoogleCalendarEvents();

  // Busca el evento seleccionado dentro de los datos ya en caché — sin petición extra
  const event = useMemo(
    () => data?.events?.find((e) => e.id === selectedEventId) ?? null,
    [data?.events, selectedEventId],
  );

  if (!event) return null;

  const dateRange = formatEventDateRange(event.start, event.end);
  const statusMeta = STATUS_LABELS[event.status] ?? STATUS_LABELS.confirmed;

  return (
    <section className="google-event-details-enter bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6">
      {/* Encabezado con título y estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">
            {event.summary}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{dateRange}</p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {/* Cuerpo del detalle */}
      <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-white/5 p-4 space-y-3">
        {/* Fecha y hora */}
        <div className="flex items-start gap-2">
          <ClockIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Fecha y hora
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
              {dateRange}
            </p>
          </div>
        </div>

        {/* Ubicación — solo si está disponible */}
        {event.location ? (
          <div className="flex items-start gap-2">
            <MapPinIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Ubicación
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">{event.location}</p>
            </div>
          </div>
        ) : null}

        {/* Descripción — solo si está disponible */}
        {event.description ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Descripción
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          </div>
        ) : null}

        {/* Organizador */}
        {event.creator ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Organizador
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">{event.creator}</p>
          </div>
        ) : null}
      </div>

      {/* Botón para abrir en Google Calendar */}
      <a
        href={event.htmlLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:hover:border-sky-800 dark:hover:bg-sky-950/30 dark:hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label={`Abrir "${event.summary}" en Google Calendar`}
      >
        <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Abrir en Google Calendar
      </a>
    </section>
  );
};
