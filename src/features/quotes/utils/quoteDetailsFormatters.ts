import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { normalizeDate } from "@/src/utils/normalizeDate";
import { formatCurrency } from "@/src/utils/formatCurrency";

// Estandariza valores de fecha provenientes del backend para mejorar el parseo.
// 1) Limpia espacios, 2) reemplaza " " por "T", 3) recorta milisegundos extra,
// 4) completa offsets cortos (-06 -> -06:00) y 5) aplica normalización global.
const normalizeQuoteDateValue = (value: string) => {
  const trimmedValue = value.trim();
  const normalizedIsoValue = trimmedValue.includes(" ") ? trimmedValue.replace(" ", "T") : trimmedValue;
  const normalizedMillisecondsValue = normalizedIsoValue.replace(
    /\.(\d{3})\d+(?=(Z|[+-]\d{2}:\d{2}|[+-]\d{2})?$)/,
    ".$1"
  );
  const normalizedTimezoneValue = /[+-]\d{2}$/.test(normalizedMillisecondsValue)
    ? `${normalizedMillisecondsValue}:00`
    : normalizedMillisecondsValue;
  return normalizeDate(normalizedTimezoneValue);
};

// Convierte una fecha del dominio de pedidos a un texto legible en español.
// Devuelve "-" si no hay valor o si no se puede interpretar como fecha válida.
export const formatQuoteDateTime = (value?: string | null, pattern = "d 'de' MMMM yyyy, HH:mm") => {
  if (!value) return "-";
  const normalizedValue = normalizeQuoteDateValue(value);
  const parsedDate = parseISO(normalizedValue);
  if (isValid(parsedDate)) {
    return format(parsedDate, pattern, { locale: es });
  }
  const fallbackDate = new Date(normalizedValue);
  if (isValid(fallbackDate)) {
    return format(fallbackDate, pattern, { locale: es });
  }
  return "-";
};

// Normaliza valores vacíos para la UI.
// Si viene undefined, null o cadena vacía, muestra "-"; en otro caso convierte a texto.
export const toDisplayValue = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
};

// Formatea montos monetarios y protege la vista frente a datos vacíos.
// Si no hay monto, devuelve "-", si existe, delega el formato al helper global.
export const toCurrencyOrDash = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  return formatCurrency(Number(value) || 0);
};

// Obtiene etiquetas activas a partir de banderas booleanas.
// Si ninguna opción está activa, devuelve ["-"] para mantener consistencia visual.
export const getEnabledOptionLabels = (options: Array<{ label: string; active: boolean }>) => {
  const enabled = options.filter((option) => option.active).map((option) => option.label);
  return enabled.length > 0 ? enabled : ["-"];
};
