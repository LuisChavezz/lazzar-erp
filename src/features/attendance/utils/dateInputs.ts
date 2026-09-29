import type { MouseEvent } from "react";
import { isCalendarDateKey } from "@/src/utils/mexicoTime";

/**
 * Año mínimo que se acepta de un `<input type="date">`. Al teclear el año
 * dígito a dígito, Chrome emite valores intermedios COMPLETOS y válidos
 * ("0002-09-16", "0020-09-16", "0202-09-16"); sin este tope cada uno llegaba a
 * la URL y disparaba una consulta, y en el historial un "desde" del año 2
 * pedía el listado entero (el endpoint no pagina).
 */
const MIN_PLAUSIBLE_YEAR = 2000;

/** ¿Es una fecha "YYYY-MM-DD" real y con un año plausible (≥ 2000)? */
export const isPlausibleDateKey = (value: string | null | undefined): value is string =>
  isCalendarDateKey(value) && Number(value.slice(0, 4)) >= MIN_PLAUSIBLE_YEAR;

/**
 * Abre el selector nativo al hacer clic en un input de fecha u hora (mismo
 * gesto que `ShiftForm`). `showPicker` lanza si el input no lo admite en ese
 * momento; no hay nada que hacer.
 */
export const openPicker = (event: MouseEvent<HTMLInputElement>) => {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    /* noop */
  }
};
