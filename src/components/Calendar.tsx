"use client";

import FullCalendar from "@fullcalendar/react";
import type { CalendarOptions } from "@fullcalendar/core";
import { forwardRef, useRef } from "react";
import { useCalendarAutoResize } from "./useCalendarAutoResize";

type CalendarProps = CalendarOptions;

// forwardRef exposes the FullCalendar instance so consumers can call the API
// (e.g. calendarRef.current?.getApi().changeView(view)).
const Calendar = forwardRef<FullCalendar, CalendarProps>(function Calendar(props, ref) {
  const internalRef = useRef<FullCalendar | null>(null); // Used internally by useCalendarAutoResize.
  const containerRef = useRef<HTMLDivElement | null>(null); // Container element reference.

  useCalendarAutoResize({ calendarRef: internalRef, containerRef }); // Auto-resize calendar when container size changes.

  return (
    <div ref={containerRef} className="min-w-0">
      <FullCalendar
        ref={(instance) => {
          // Keep the internal ref in sync (needed by useCalendarAutoResize),
          // and forward the instance to any external ref.
          internalRef.current = instance;
          if (typeof ref === "function") {
            ref(instance);
          } else if (ref) {
            ref.current = instance;
          }
        }}
        {...props}
      />
    </div>
  );
});

Calendar.displayName = "Calendar";

export default Calendar;
