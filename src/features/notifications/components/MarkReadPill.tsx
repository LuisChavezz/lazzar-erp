import type { RefObject } from "react";
import { CheckCircleIcon } from "../../../components/Icons";
import { formatMexicoDateTime } from "@/src/utils/formatRelativeTime";
import { refocusOnUnmount } from "../utils/refocusOnUnmount";

interface Props {
  /** Marca la notificación como leída sin abrir su destino. */
  onClick: () => void;
  /**
   * Destino del foco cuando la píldora desaparece al pulsarse: el optimista
   * deja la fila en leída en el acto y la desmonta (ver `refocusOnUnmount`).
   */
  focusFallbackRef: RefObject<HTMLElement | null>;
  /** Título de la notificación: nombra el botón para lectores de pantalla. */
  titulo: string;
  /**
   * `created_at` de la notificación: su fecha y hora completas distinguen
   * píldoras de notificaciones con el mismo título.
   */
  createdAt: string | null | undefined;
  /** Clases extra de cada superficie (el dropdown la separa con `mt-2`). */
  className?: string;
}

/**
 * Píldora "Marcar leída", compartida por el dropdown y el modal. Solo es el
 * control: CUÁNDO se ofrece lo decide cada fila (ver `NotificationItem`).
 */
export function MarkReadPill({
  onClick,
  focusFallbackRef,
  titulo,
  createdAt,
  className,
}: Props) {
  // Mismo texto que el `title` de `NotificationTimestamp`; sin fecha válida,
  // solo el título.
  const fecha = formatMexicoDateTime(createdAt);
  return (
    <button
      ref={refocusOnUnmount(focusFallbackRef)}
      type="button"
      onClick={onClick}
      aria-label={`Marcar leída: ${titulo}${fecha ? `, ${fecha}` : ""}`}
      className={`${className ? `${className} ` : ""}inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-700 px-2 py-1 rounded-full cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors`}
    >
      <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />
      Marcar leída
    </button>
  );
}
