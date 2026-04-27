"use client";

import FullCalendar from "@fullcalendar/react";
import type { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useRef, useState, useMemo, lazy, Suspense } from "react";
import { DropdownMenu } from "@radix-ui/themes";
import Calendar from "@/src/components/Calendar";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";

const GoogleCalendarEventForm = lazy(() => import("./GoogleCalendarEventForm"));
import { useGoogleCalendarEvents } from "../hooks/useGoogleCalendarEvents";
import { useGoogleCalendarStore } from "../stores/google-calendar.store";
import { GoogleUpcomingEvents } from "./GoogleUpcomingEvents";
import { GoogleEventDetails } from "./GoogleEventDetails";
import {
  type CalendarView,
  VIEW_OPTIONS,
  EVENT_TIME_FORMAT,
  DAY_VIEW_TIME_FORMAT,
  getEventClass,
} from "../constants/googleCalendar";

export const GoogleCalendar = () => {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentView, setCurrentView] = useState<CalendarView>("dayGridMonth");
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Fecha preseleccionada al hacer clic en un día del calendario (YYYY-MM-DD).
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { data, isLoading } = useGoogleCalendarEvents();
  const rawEvents = data?.events;

  const setSelectedEventId = useGoogleCalendarStore((s) => s.setSelectedEventId);

  // Adapta los eventos de Google Calendar al formato EventInput de FullCalendar.
  // No se incluye `url` para evitar que FullCalendar redireccione al hacer clic.
  const calendarEvents = useMemo<EventInput[]>(() => {
    if (!rawEvents) return [];
    return rawEvents
      .filter((event) => event.status !== "cancelled")
      .map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start,
        end: event.end,
        classNames: [getEventClass(event.status)],
        extendedProps: {
          description: event.description,
          location: event.location,
          creator: event.creator,
          status: event.status,
          htmlLink: event.htmlLink,
        },
      }));
  }, [rawEvents]);

  const handleViewChange = (view: CalendarView) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  // Abre el modal de nuevo evento con la fecha del día clicado preseleccionada.
  const handleDateClick = (info: DateClickArg) => {
    setSelectedDate(info.dateStr);
    setIsFormOpen(true);
  };

  // Skeleton mientras se cargan los eventos
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="sales-fullcalendar-theme sales-fullcalendar-loading h-110" />
        <div className="space-y-4">
          <GoogleUpcomingEvents />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* Calendario principal */}
      <div className="sales-fullcalendar-theme min-w-0 relative">
        {/* Selector de vista y botón nuevo evento — flotando sobre el área derecha del header */}
        <div className="absolute top-2 right-2 z-10 flex items-stretch gap-1.5">
          <button
            type="button"
            aria-label="Nuevo evento de Google Calendar"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1 rounded-md cursor-pointer border border-[#d1e1f5] dark:border-[#1f3356] bg-[#f8fbff] dark:bg-[#0d1a33] text-[0.68rem] font-bold uppercase text-[#0f172a] dark:text-[#cfe2ff] px-[0.45rem] py-[0.22rem] hover:bg-[#eef5ff] dark:hover:bg-[#10244a] transition-colors"
          >
            <PlusIcon className="h-3 w-3" aria-hidden="true" />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                type="button"
                aria-label="Seleccionar vista del calendario"
                className="inline-flex items-center gap-0.5 rounded-md cursor-pointer border border-[#d1e1f5] dark:border-[#1f3356] bg-[#f8fbff] dark:bg-[#0d1a33] text-[0.68rem] font-bold uppercase text-[#0f172a] dark:text-[#cfe2ff] px-[0.45rem] py-[0.22rem] hover:bg-[#eef5ff] dark:hover:bg-[#10244a] transition-colors"
              >
                {VIEW_OPTIONS.find((v) => v.value === currentView)?.label}
                <ChevronDownIcon className="h-1.5 w-1.5" aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="end"
              className="bg-white! dark:bg-zinc-900! min-w-28 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
            >
              {VIEW_OPTIONS.map(({ value, label }) => (
                <DropdownMenu.Item
                  key={value}
                  onSelect={() => handleViewChange(value)}
                  className={[
                    "flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer! outline-none transition-colors",
                    currentView === value
                      ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30"
                      : "text-slate-600 dark:text-slate-300 data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400",
                  ].join(" ")}
                >
                  <span className="flex w-3 items-center justify-center">
                    {currentView === value && (
                      <CheckIcon className="h-2.5 w-2.5" aria-hidden="true" />
                    )}
                  </span>
                  {label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <Calendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locales={[esLocale]}
          locale="es"
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{ today: "Hoy" }}
          firstDay={0}
          dayHeaderContent={(arg) => arg.text.replace(".", "").toUpperCase()}
          displayEventTime={true}
          eventTimeFormat={currentView === "timeGridDay" ? DAY_VIEW_TIME_FORMAT : EVENT_TIME_FORMAT}
          slotLabelFormat={DAY_VIEW_TIME_FORMAT}
          displayEventEnd={currentView === "timeGridDay"}
          dayMaxEventRows={true}
          fixedWeekCount={false}
          editable={false}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={(arg) => {
            // Previene la redirección nativa de FullCalendar si el evento tiene url
            arg.jsEvent.preventDefault();
            setSelectedEventId(arg.event.id);
          }}
          height="auto"
          contentHeight="auto"
        />
      </div>

      {/* Panel lateral: próximos eventos + detalle del evento seleccionado */}
      <div className="xl:sticky xl:top-4 self-start">
        <div className="space-y-4">
          <GoogleUpcomingEvents />
          <GoogleEventDetails />
        </div>
      </div>

      {/* Diálogo de creación de evento */}
      <MainDialog
        title="Nuevo evento de Google Calendar"
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedDate("");
        }}
        maxWidth="680px"
      >
        <Suspense fallback={null}>
          {/* key={selectedDate} fuerza remontaje cuando cambia la fecha clicada */}
          <GoogleCalendarEventForm
            key={selectedDate}
            initialDate={selectedDate || undefined}
            onSuccess={() => {
              setIsFormOpen(false);
              setSelectedDate("");
            }}
          />
        </Suspense>
      </MainDialog>
    </div>
  );
};
