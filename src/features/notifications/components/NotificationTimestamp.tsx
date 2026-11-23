import { useMinuteNow } from "@/src/hooks/useMinuteNow";
import { formatMexicoDateTime, formatRelativeTime } from "@/src/utils/formatRelativeTime";

interface Props {
  /** `created_at` de la notificación: ISO 8601 con offset. */
  createdAt: string | null | undefined;
  /** Clases del texto; cada superficie conserva las suyas. */
  className?: string;
}

/**
 * Fecha de una notificación, compartida por el dropdown y el modal: etiqueta
 * híbrida ("Hace 5 min", "Ayer, 16:20", "13 nov") que avanza al minuto con la
 * vista abierta (`useMinuteNow`), y la fecha y hora completas en `title`.
 * Sin valor válido no pinta nada.
 */
export function NotificationTimestamp({ createdAt, className }: Props) {
  const nowMs = useMinuteNow();
  if (nowMs === null || !createdAt) return null;

  const label = formatRelativeTime(createdAt, nowMs);
  const full = formatMexicoDateTime(createdAt);
  if (label === null || full === null) return null;

  return (
    <time dateTime={createdAt} title={full} className={className}>
      {label}
    </time>
  );
}
