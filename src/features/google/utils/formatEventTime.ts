import { isToday, isTomorrow, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

/** Devuelve una etiqueta legible de la fecha/hora de inicio de un evento de Google Calendar. */
export const formatEventTime = (isoString: string): string => {
  const date = parseISO(isoString);
  if (isNaN(date.getTime())) return "Fecha inválida";
  if (isToday(date)) return `Hoy, ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Mañana, ${format(date, "HH:mm")}`;
  const label = format(date, "EEEE d 'de' MMM", { locale: es });
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}, ${format(date, "HH:mm")}`;
};
