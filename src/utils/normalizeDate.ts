
// Normaliza la fecha y hora para que siempre tenga el formato ISO 8601 con zona horaria -06:00
export function normalizeDate(value: string) {
  if (!value) return value;
  if (/([+-]\d{2}:\d{2}|Z)$/.test(value)) {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.length === 16 ? `${value}:00-06:00` : `${value}-06:00`;
  }
  return value;
}
