import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

export function formatTaskTime(date: Date, options?: { allDay?: boolean }) {
  if (options?.allDay) {
    if (isToday(date)) return "Hoy · Todo el día";
    if (isTomorrow(date)) return "Mañana · Todo el día";
    const label = format(date, "EEEE d 'de' MMM", { locale: es });
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} · Todo el día`;
  }
  const gmtDate = toGmtMinusSixDate(date);
  if (isToday(gmtDate)) {
    return `Hoy, ${format(gmtDate, "HH:mm")}`;
  }
  if (isTomorrow(gmtDate)) {
    return `Mañana, ${format(gmtDate, "HH:mm")}`;
  }
  return format(gmtDate, "EEEE, HH:mm", { locale: es });
}

const toGmtMinusSixDate = (date: Date) => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc - 6 * 60 * 60000);
};