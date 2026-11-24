import type { ReactNode } from "react";
import { formatShortDateTime } from "@/src/utils/formatDate";

interface CancellationInfoProps {
  /** Encabezado del bloque: "Recepción cancelada", "Envío cancelado"… */
  title: string;
  motivo?: string | null;
  fecha?: string | null;
  /** Nombre de quien canceló (`cancelado_por_nombre`). */
  canceladoPor?: string | null;
  /** Renglón extra bajo los datos (p. ej. la TR que revirtió a esta). */
  children?: ReactNode;
}

/**
 * Quién, cuándo y por qué se canceló un documento. Solo se monta en un
 * documento cancelado; un dato que el backend no trae (cancelado antes de que
 * existiera, o una versión anterior del backend) se dice "—" en vez de
 * esconder el bloque. Lo comparten la recepción (EC-925) y los documentos de
 * WMS (EC-945).
 */
export function CancellationInfo({ title, motivo, fecha, canceladoPor, children }: CancellationInfoProps) {
  return (
    <section
      aria-label="Cancelación"
      className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 space-y-2"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">{title}</h3>
      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line wrap-break-word">
        {motivo?.trim() || "Sin motivo registrado."}
      </p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex gap-1.5">
          <dt className="text-slate-500 dark:text-slate-400">Fecha:</dt>
          <dd>{formatShortDateTime(fecha)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-500 dark:text-slate-400">Canceló:</dt>
          <dd>{canceladoPor?.trim() || "—"}</dd>
        </div>
      </dl>
      {children}
    </section>
  );
}
