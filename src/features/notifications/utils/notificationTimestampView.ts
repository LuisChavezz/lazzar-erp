import { formatMexicoDateTime, formatRelativeTime } from "@/src/utils/formatRelativeTime";

export interface NotificationTimestampView {
  /** Atributo `dateTime` del `<time>`: el `created_at` tal como llega. */
  dateTime: string;
  /** Fecha y hora completas en México, para el `title`. */
  title: string;
  /** Etiqueta híbrida visible ("Hace 5 min", "Ayer, 16:20", "13 nov"). */
  label: string;
}

/**
 * Lo que pinta `NotificationTimestamp`, o `null` si no debe pintar nada: sin
 * "ahora" (SSR/hidratación de `useMinuteNow`) o con `created_at` ausente o
 * que no parsea.
 */
export const getNotificationTimestampView = (
  createdAt: string | null | undefined,
  nowMs: number | null,
): NotificationTimestampView | null => {
  if (nowMs === null || !createdAt) return null;
  const label = formatRelativeTime(createdAt, nowMs);
  const title = formatMexicoDateTime(createdAt);
  if (label === null || title === null) return null;
  return { dateTime: createdAt, title, label };
};
