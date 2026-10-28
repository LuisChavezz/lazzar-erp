import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { normalizeDate } from "@/src/utils/normalizeDate";
import { formatQuoteAmount } from "./formatQuoteAmount";

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

/**
 * Importe de cotización en la moneda `monedaCodigo`: lo usan las filas de los
 * listados (Ventas y Mesa de Control), sus exportaciones y los documentos.
 * Formatea igual que las pantallas de cotización (`formatQuoteAmount`: "USD 1,227.00", "MXN 1,227.00";
 * sin código, sin símbolo — nunca MXN por defecto).
 *
 * Un importe ausente o malformado ("", `null`, "1,000.00", `NaN`) se pinta "-",
 * no "0.00": un cero afirmaría un importe que el dato no dice. Se parsea con
 * `Number()`, la misma regla de `safeParseAmount` (rechaza el string completo en
 * vez de leerlo a medias como `parseFloat`), pero sin su respaldo a 0.
 */
export const formatQuoteAmountOrDash = (
  value: string | number | null | undefined,
  monedaCodigo: string | null,
): string => {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  return Number.isFinite(amount) ? formatQuoteAmount(amount, monedaCodigo) : "-";
};

/**
 * `formatQuoteAmountOrDash` con la moneda fija: un formateador por documento
 * (PDF y correo de la cotización).
 */
export const createQuoteAmountFormatter =
  (monedaCodigo: string | null) =>
  (value: string | number | null | undefined): string =>
    formatQuoteAmountOrDash(value, monedaCodigo);

/**
 * Nombre a mostrar de una partida de cotización.
 *
 * Una partida de PRODUCTO DE MUESTRA no apunta al catálogo: el serializer
 * declara `producto_nombre` como `CharField(source="producto.nombre")` sin
 * `default`, así que con `producto = null` DRF omite la clave por completo y el
 * nombre real viaja en `producto_nombre_externo`. Sin este respaldo la partida
 * se pintaba con el nombre en blanco.
 */
export const getQuoteDetailProductName = (detalle: {
  producto_nombre?: string | null;
  producto_nombre_externo?: string | null;
}) => detalle.producto_nombre || detalle.producto_nombre_externo || "-";

// Obtiene etiquetas activas a partir de banderas booleanas.
// Si ninguna opción está activa, devuelve ["-"] para mantener consistencia visual.
export const getEnabledOptionLabels = (options: Array<{ label: string; active: boolean }>) => {
  const enabled = options.filter((option) => option.active).map((option) => option.label);
  return enabled.length > 0 ? enabled : ["-"];
};
