/**
 * Recorta una hora del backend (`"HH:MM:SS"`, a veces con microsegundos) al
 * `"HH:MM"` que consume y produce un `<input type="time">`.
 *
 * Se parte por `:` en lugar de cortar por longitud fija: un `TimeField` de
 * Django puede serializar `"08:00:00.123456"`, y `slice(0, 5)` funcionaría por
 * casualidad ahí pero no con cualquier otra variante. Partir es explícito
 * sobre lo que se conserva.
 *
 * Al ENVIAR no hace falta la operación inversa: la API acepta `"HH:MM"`.
 */
export const trimTimeToHHMM = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) {
    return "";
  }

  return `${hours}:${minutes}`;
};
