"use client";

import { CalendarOccupancyProvider } from "@/src/hooks/useEmployeeCalendarOccupancy";
import type { CalendarOccupancySource } from "@/src/interfaces/hr-calendar.interface";
import { vacationOccupancySource } from "@/src/features/vacations/utils/vacationOccupancy";
import { absenceOccupancySource } from "@/src/features/absences/utils/absenceOccupancy";

/**
 * Recursos de RH que OCUPAN días del calendario de un empleado. Cada módulo
 * aporta su fuente (consulta por empleado + traducción con sus constantes) y
 * este hub las reparte: vacaciones y ausencias se revisan mutuamente el
 * traslape SIN importarse entre sí. Un recurso nuevo que ocupe días se agrega
 * aquí y nada más.
 */
const HR_CALENDAR_SOURCES: readonly CalendarOccupancySource[] = [
  vacationOccupancySource,
  absenceOccupancySource,
];

/**
 * Es de cliente porque las fuentes son funciones: no cruzan el límite RSC
 * desde el layout de servidor.
 */
export function HrCalendarOccupancyProvider({ children }: { children: React.ReactNode }) {
  return <CalendarOccupancyProvider value={HR_CALENDAR_SOURCES}>{children}</CalendarOccupancyProvider>;
}
