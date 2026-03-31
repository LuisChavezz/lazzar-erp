"use client";

import type FullCalendar from "@fullcalendar/react";
import { RefObject, useEffect } from "react";

interface UseCalendarAutoResizeParams {
  calendarRef: RefObject<FullCalendar | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Mantiene FullCalendar sincronizado con cambios de layout que no siempre
 * disparan un recálculo interno automático (por ejemplo, sidebar expand/collapse).
 *
 * Estrategia:
 * 1) Ejecuta updateSize al montar.
 * 2) Reintenta en pequeños delays para cubrir transiciones CSS.
 * 3) Escucha resize del contenedor (ResizeObserver) para reaccionar a cambios de ancho.
 * 4) Escucha resize de ventana como respaldo global.
 */
export const useCalendarAutoResize = ({
  calendarRef,
  containerRef,
}: UseCalendarAutoResizeParams) => {
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const syncSize = () => {
      requestAnimationFrame(() => {
        calendarApi.updateSize();
      });
    };

    syncSize();
    const pendingTimeouts = [80, 180, 320].map((delay) => window.setTimeout(syncSize, delay));

    const resizeTarget = containerRef.current;
    const resizeObserver =
      resizeTarget && "ResizeObserver" in window
        ? new ResizeObserver(() => {
            syncSize();
          })
        : null;

    if (resizeObserver && resizeTarget) {
      resizeObserver.observe(resizeTarget);
    }

    const handleWindowResize = () => {
      syncSize();
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      pendingTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.removeEventListener("resize", handleWindowResize);
      resizeObserver?.disconnect();
    };
  }, [calendarRef, containerRef]);
};
