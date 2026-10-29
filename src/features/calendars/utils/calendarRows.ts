import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";
import type { ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import type { Calendar } from "../interfaces/calendar.interface";
import type { CalendarRow } from "../components/CalendarColumns";
import { getTipoLabel, TIPO_OPTIONS } from "../constants/tipoCalendario";

/**
 * Filas de la tabla: cada día con el nombre de su turno resuelto. Un FK que no
 * está en el catálogo (o cuyo catálogo no ha llegado) se rotula `Turno #N`, una
 * sola vez: la celda y el filtro de encabezado leen ese mismo texto (ver
 * `CalendarRow`).
 */
export const buildCalendarRows = (
  calendars: readonly Calendar[],
  shiftNameById: ReadonlyMap<number, string>,
): CalendarRow[] =>
  calendars.map((calendar) => ({
    ...calendar,
    turno_nombre: shiftNameById.get(calendar.turno) ?? `Turno #${calendar.turno}`,
  }));

/**
 * Opciones del filtro de tipo: el catálogo en su orden, SIN el "sin tipo" (la
 * cadena vacía), que va como `emptyOption` del filtro, fijado primero. Un
 * código que el catálogo no conoce lo agrega `withHeaderFilters` al final, con
 * el valor crudo como etiqueta.
 */
export const CALENDAR_TIPO_FILTER_OPTIONS: ColumnFilterOption[] = TIPO_OPTIONS.filter(
  (option) => option.value !== "",
);

/** Etiqueta del "sin tipo" del catálogo, para la `emptyOption` del filtro. */
export const SIN_TIPO_LABEL = TIPO_OPTIONS.find((option) => option.value === "")?.label ?? "Sin tipo";

/**
 * Texto del tipo en la celda: la etiqueta del catálogo; "—" sin tipo; y un
 * código fuera del catálogo, crudo — el mismo texto que su opción de filtro.
 */
export const getCalendarTipoText = (tipo: string | null): string => getTipoLabel(tipo) ?? (tipo || "—");

/** Avisos del diálogo de eliminar que se cerró por un cambio externo. */
export const CALENDAR_STALE_MESSAGES: StaleRowDialogMessages = {
  gone: "El día ya no existe. Se actualizó el listado.",
};
