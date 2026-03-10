
// Convierte la fecha y hora normalizada a formato de entrada para el formulario
export function toInputDateTime(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const isoDate = new Date(trimmed);
  if (Number.isNaN(isoDate.getTime())) {
    return "";
  }
  const localDate = new Date(isoDate.getTime() - isoDate.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};