"use client";

import FullCalendar from "@fullcalendar/react";
import type { CalendarOptions } from "@fullcalendar/core";
import { useRef } from "react";
import { useCalendarAutoResize } from "./useCalendarAutoResize";

type CalendarProps = CalendarOptions;

export default function Calendar(props: CalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null); // Calendar instance reference.
  const containerRef = useRef<HTMLDivElement | null>(null); // Container element reference.

  useCalendarAutoResize({ calendarRef, containerRef }); // Auto-resize calendar when container size changes.

  return (
    <div ref={containerRef} className="min-w-0">
      <FullCalendar ref={calendarRef} {...props} />
    </div>
  );
}
