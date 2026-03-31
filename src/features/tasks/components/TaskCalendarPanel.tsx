"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import Calendar from "@/src/components/Calendar";
import { useTasksCalendarEvents } from "../hooks/useTasksCalendarEvents";
import { TaskDetails } from "./TaskDetails";
import { UpcomingTasks } from "./UpcomingTasks";

export const TaskCalendarPanel = () => {
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
  } = useTasksCalendarEvents();

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
      <div className="sales-fullcalendar-theme min-w-0">
        <Calendar
          plugins={[dayGridPlugin, interactionPlugin]}
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
          displayEventTime={false}
          dayMaxEvents={2}
          fixedWeekCount={false}
          events={calendarEvents}
          eventContent={(info) => (
            <div className={`event-pill ${info.event.classNames.join(" ")}`}>{info.event.title}</div>
          )}
          eventClick={(arg) => handleEventClick(arg.event.id)}
          dateClick={(arg) => handleDateClick(arg.date, arg.jsEvent.detail)}
          selectable
          editable
          eventDrop={(arg) => handleEventDateChange(arg.event.id, arg.event.start)}
          eventResize={(arg) => handleEventDateChange(arg.event.id, arg.event.start)}
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
