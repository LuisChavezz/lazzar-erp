"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMexicoFortnightRange, getMexicoTodayDate } from "@/src/utils/mexicoTime";
import { isPlausibleDateKey } from "../utils/dateInputs";

export type AttendanceTab = "pase" | "historial";

/**
 * Estado de la pantalla en la URL, igual que los filtros de
 * `BankReconciliationView`: el enlace es compartible y sobrevive al refresh y
 * al botón de atrás.
 *
 * - `tab`: `historial`, o ausente para el pase de lista.
 * - `fecha` (pase de lista): un día válido, con año plausible y no futuro; si
 *   falta, es inválido o es futuro, HOY en México.
 * - `todos=1` (pase de lista): "Mostrar a todos".
 * - `desde` / `hasta` (historial): si faltan o están vacíos, el extremo
 *   correspondiente de la quincena en curso (vaciar el campo quita el
 *   parámetro, como "Día"). Un valor inválido se respeta y la vista no
 *   consulta hasta que el periodo vuelva a ser válido.
 */
export function useAttendanceSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = getMexicoTodayDate();
  const fortnight = getMexicoFortnightRange();

  const tab: AttendanceTab = searchParams.get("tab") === "historial" ? "historial" : "pase";

  const fechaParam = searchParams.get("fecha");
  const fecha = isPlausibleDateKey(fechaParam) && fechaParam <= today ? fechaParam : today;

  const showAll = searchParams.get("todos") === "1";

  // `||` y no `??`: un parámetro VACÍO (URL vieja o escrita a mano) también
  // cae al extremo de la quincena, igual que un `fecha` vacío cae a hoy.
  const desde = searchParams.get("desde") || fortnight.desde;
  const hasta = searchParams.get("hasta") || fortnight.hasta;

  /**
   * Cambiar un parámetro es ajustar la vista, no navegar: `replace` para no
   * ensuciar el historial. `null` quita el parámetro (vuelve a su default); un
   * texto, incluido "", se guarda tal cual.
   */
  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return { today, tab, fecha, showAll, desde, hasta, setParams };
}
