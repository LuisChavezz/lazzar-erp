"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useRef, useState } from "react";
import { DropdownMenu } from "@radix-ui/themes";
import Calendar from "@/src/components/Calendar";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "@/src/components/Icons";
import { useTasksCalendarEvents, type TasksCalendarView } from "../hooks/useTasksCalendarEvents";
import { TaskDetails } from "./TaskDetails";
import { UpcomingTasks } from "./UpcomingTasks";

const VIEW_OPTIONS: { value: TasksCalendarView; label: string }[] = [
  { value: "dayGridMonth", label: "Mes" },
  { value: "timeGridDay", label: "Día" },
];

const EVENT_TIME_FORMAT = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
} as const;

const DAY_VIEW_TIME_FORMAT = {
  hour: "numeric",
  minute: "2-digit",
  meridiem: false,
  omitZeroMinute: false,
} as const;

export const TaskCalendarPanel = () => {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentView, setCurrentView] = useState<TasksCalendarView>("dayGridMonth");

  // El hook centraliza estado, eventos del calendario y sincronización con la store.
  const {
    hasHydrated,
    calendarEvents,
    handleEventDateChange,
    handleEventClick,
    handleDateClick,
    selectedTask,
    clearSelectedTask,
    dialogCalendarDate,
    isTaskDialogOpen,
    handleTaskDialogOpenChange,
  } = useTasksCalendarEvents(currentView);

  const handleViewChange = (view: TasksCalendarView) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  // Skeleton mientras Zustand hidrata estado desde persistencia en cliente.
  if (!hasHydrated) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="sales-fullcalendar-theme sales-fullcalendar-loading h-110" />
        <div className="space-y-4">
          <UpcomingTasks onlyTodayPending />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* relative wrapper so the view dropdown can be positioned over the header's right area */}
      <div className="sales-fullcalendar-theme min-w-0 relative">
        {/* Toolbar actions — floats in the header's right slot (right: 8px matches fc-header-toolbar padding) */}
        <div className="absolute top-2 right-2 z-10 flex items-stretch gap-1.5">
          {/* Add task button */}
          <button
            type="button"
            aria-label="Agregar tarea"
            onClick={() => handleTaskDialogOpenChange(true)}
            className="inline-flex items-center justify-center rounded-md cursor-pointer border border-[#d1e1f5] dark:border-[#1f3356] bg-[#f8fbff] dark:bg-[#0d1a33] text-[#0f172a] dark:text-[#cfe2ff] px-[0.45rem] py-[0.22rem] hover:bg-[#eef5ff] dark:hover:bg-[#10244a] transition-colors"
          >
            <PlusIcon className="h-2.75 w-2.75" aria-hidden="true" />
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
          buttonText={{
            today: "Hoy",
          }}
          firstDay={0}
          dayHeaderContent={(arg) => arg.text.replace(".", "").toUpperCase()}
          displayEventTime={true}
          eventTimeFormat={currentView === "timeGridDay" ? DAY_VIEW_TIME_FORMAT : EVENT_TIME_FORMAT}
          slotLabelFormat={DAY_VIEW_TIME_FORMAT}
          displayEventEnd={currentView === "timeGridDay"}
          dayMaxEventRows={true}
          fixedWeekCount={false}
          eventStartEditable
          eventDurationEditable
          eventResizableFromStart
          events={calendarEvents}
          eventClick={(arg) => handleEventClick(arg.event.id)}
          dateClick={(arg) => handleDateClick(arg.date, arg.jsEvent.detail)}
          selectable
          editable
          eventDrop={(arg) =>
            handleEventDateChange(arg.event.id, arg.event.start, arg.event.end, {
              nextAllDay: arg.event.allDay,
              previousAllDay: arg.oldEvent.allDay,
            })
          }
          eventResize={(arg) =>
            handleEventDateChange(arg.event.id, arg.event.start, arg.event.end, {
              nextAllDay: arg.event.allDay,
              previousAllDay: arg.oldEvent.allDay,
            })
          }
          height="auto"
          contentHeight="auto"
        />
      </div>
      <div className="xl:sticky xl:top-4">
        <div className="space-y-4">
          <UpcomingTasks
            onlyTodayPending
            dialogOpen={isTaskDialogOpen}
            onDialogOpenChange={handleTaskDialogOpenChange}
            defaultCalendarDate={dialogCalendarDate}
          />
          <TaskDetails
            key={selectedTask?.id ?? "task-details-empty"}
            task={selectedTask}
            onTaskDeleted={clearSelectedTask}
          />
        </div>
      </div>
    </div>
  );
};
