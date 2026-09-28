"use client";

import { createContext, useContext } from "react";
import { useQueries } from "@tanstack/react-query";
import type {
  CalendarOccupancySource,
  CalendarOccupant,
} from "../interfaces/hr-calendar.interface";

// ─── Fuentes de ocupación del calendario de RH ───────────────────────────────
// Cada módulo que ocupa días (vacaciones, permisos y ausencias) aporta su
// fuente; el hub de RH las reparte con este Provider. Así un formulario
// consulta los OTROS recursos del empleado sin importar sus módulos.

const CalendarOccupancyContext = createContext<readonly CalendarOccupancySource[] | null>(null);

export const CalendarOccupancyProvider = CalendarOccupancyContext.Provider;

/**
 * Fuentes de los OTROS recursos (todas menos `ownKind`). Exige el Provider: sin
 * él la regla de traslape entre recursos se perdería EN SILENCIO, que es
 * justo lo que una guarda que falla cerrado no puede permitir.
 */
export function useForeignOccupancySources(ownKind: string): CalendarOccupancySource[] {
  const sources = useContext(CalendarOccupancyContext);
  if (!sources) {
    throw new Error(
      "Falta el CalendarOccupancyProvider: los formularios de RH que ocupan días deben renderizarse bajo HrCalendarOccupancyProvider (ver el layout de /hr)."
    );
  }
  return sources.filter((source) => source.kind !== ownKind);
}

/** Prefijo de las consultas por empleado. */
export const CALENDAR_OCCUPANCY_KEY = ["calendar-occupancy"] as const;

/**
 * Ocupación de UN empleado en las fuentes dadas, para el aviso de traslape en
 * blur. Solo consulta con un empleado elegido (`?empleado=`, nunca el listado
 * completo). `staleTime: 0`: cada formulario abierto vuelve a pedirla.
 *
 * Es un AVISO: mientras carga o si falla, no aporta nada. La decisión la toma
 * la guarda previa a escribir, contra datos frescos y fallando cerrado.
 */
export function useEmployeeCalendarOccupancy(
  sources: readonly CalendarOccupancySource[],
  empleado: number
): CalendarOccupant[] {
  const results = useQueries({
    queries: sources.map((source) => ({
      queryKey: [...CALENDAR_OCCUPANCY_KEY, source.kind, empleado],
      queryFn: () => source.fetchByEmployee(empleado),
      enabled: empleado > 0,
      staleTime: 0,
    })),
  });

  return empleado > 0 ? results.flatMap((result) => result.data ?? []) : [];
}
