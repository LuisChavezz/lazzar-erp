"use client";

import type { EventInput } from "@fullcalendar/core";
import { addDays, addHours, isValid, parseISO, startOfDay, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { useUpcomingTasksStore } from "../stores/upcoming-tasks.store";

const toneClasses = ["event-sky"];

export type TasksCalendarView = "dayGridMonth" | "timeGridDay";

interface EventDateChangeContext {
  nextAllDay: boolean;
  previousAllDay: boolean;
}

// Extrae YYYY-MM-DD de un objeto Date usando su año/mes/día locales.
const dateToStr = (d: Date): string => {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
};

const toAllDayStartIso = (date: Date): string => `${dateToStr(startOfDay(date))}T00:00:00-06:00`;

const toAllDayEndIso = (date: Date): string => `${dateToStr(startOfDay(date))}T23:59:59-06:00`;

const resolveTimedEnd = (start: Date, end: Date | null): Date => {
  if (end && end.getTime() > start.getTime() && dateToStr(end) === dateToStr(start)) {
    return end;
  }

  return addHours(start, 1);
};

export const useTasksCalendarEvents = (currentView: TasksCalendarView) => {
  // Fuente única de verdad para tareas e hidratación.
  const tasks = useUpcomingTasksStore((state) => state.tasks);
  const hasHydrated = useUpcomingTasksStore((state) => state.hasHydrated);
  const updateTask = useUpcomingTasksStore((state) => state.updateTask);
  // Estado UI para detalle seleccionado y control del diálogo de alta.
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [dialogCalendarDate, setDialogCalendarDate] = useState<Date | null>(null);

  // Mapa para resolver rápidamente una tarea cuando se arrastra/redimensiona un evento.
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  // Adaptación de tareas al formato EventInput según el tipo y la vista activa.
  // allDay=true  → redimensionable solo en mes; en día no debe mostrar handles.
  // allDay=false → list-item (punto + título) en mes; en día conserva resize vertical.
  const calendarEvents = useMemo<EventInput[]>(
    () =>
      tasks.reduce<EventInput[]>((events, task, index) => {
        const start = parseISO(task.startDate);
        const end = parseISO(task.endDate);
        if (!isValid(start) || !isValid(end)) return events;

        const baseEvent: EventInput = {
          id: task.id,
          title: task.title,
          classNames: [toneClasses[index % toneClasses.length]],
        };

        if (task.allDay) {
          // Evento de todo el día: bloque visual de inicio a fin (inclusive).
          // FullCalendar usa end exclusivo, por eso se suma un día.
          events.push({
            ...baseEvent,
            start: startOfDay(start),
            end: addDays(startOfDay(end), 1),
            allDay: true,
            durationEditable: currentView === "dayGridMonth",
          });
          return events;
        }

        if (currentView === "dayGridMonth") {
          // Evento con hora en vista mensual: punto + título (list-item style).
          // backgroundColor fuerza el color del dot en FullCalendar; durationEditable
          // deshabilita el resize para que solo los allDay puedan estirarse.
          events.push({
            ...baseEvent,
            start,
            end,
            allDay: false,
            display: "list-item",
            backgroundColor: "#0284c7",
            durationEditable: false,
          });
          return events;
        }

        // Vista de día: evento con hora exacta y resize vertical habilitado.
        events.push({
          ...baseEvent,
          start,
          end,
          allDay: false,
          durationEditable: true,
        });
        return events;
      }, []),
    [currentView, tasks]
  );

  const handleEventDateChange = (
    eventId: string,
    start: Date | null,
    end: Date | null,
    { nextAllDay, previousAllDay }: EventDateChangeContext
  ) => {
    if (!start) return;
    const task = taskById.get(eventId);
    if (!task) return;

    if (nextAllDay) {
      if (currentView === "timeGridDay") {
        // En la vista de día, soltar en el carril all-day colapsa el evento al día visible.
        updateTask({
          ...task,
          allDay: true,
          startDate: toAllDayStartIso(start),
          endDate: toAllDayEndIso(start),
        });
        return;
      }

      // Preservar la semántica 00:00:00 / 23:59:59 al arrastrar o redimensionar.
      // FullCalendar usa end exclusivo para allDay, por eso se resta un día al end.
      const newStartStr = dateToStr(startOfDay(start));
      const exclusiveEnd = end ? startOfDay(end) : addDays(startOfDay(start), 1);
      const visibleEnd = subDays(exclusiveEnd, 1);
      const newEndStr = dateToStr(visibleEnd);
      updateTask({
        ...task,
        allDay: true,
        startDate: `${newStartStr}T00:00:00-06:00`,
        endDate: `${newEndStr}T23:59:59-06:00`,
      });
      return;
    }

    // Si cruza desde all-day hacia horas en vista de día, se colapsa al día visible.
    const nextEnd = previousAllDay && currentView === "timeGridDay" ? resolveTimedEnd(start, end) : end ?? addHours(start, 1);

    updateTask({
      ...task,
      allDay: false,
      startDate: start.toISOString(),
      endDate: nextEnd.toISOString(),
    });
  };

  const handleEventClick = (eventId: string) => {
    setSelectedTaskId(eventId);
  };

  const handleDateClick = (date: Date, clickDetail: number) => {
    // Solo en doble click se abre el modal para crear una nueva tarea.
    if (clickDetail !== 2) return;
    setDialogCalendarDate(date);
    setIsTaskDialogOpen(true);
  };

  const handleTaskDialogOpenChange = (open: boolean) => {
    setIsTaskDialogOpen(open);
    if (!open) {
      setDialogCalendarDate(null);
    }
  };

  // Se expone la tarea seleccionada para que el panel de detalle renderice su contenido.
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );

  return {
    hasHydrated,
    calendarEvents,
    handleEventDateChange,
    handleEventClick,
    handleDateClick,
    selectedTask,
    clearSelectedTask: () => setSelectedTaskId(null),
    dialogCalendarDate,
    isTaskDialogOpen,
    handleTaskDialogOpenChange,
  };
};
