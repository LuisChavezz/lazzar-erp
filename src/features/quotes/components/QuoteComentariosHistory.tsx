"use client";

import { ActivityTimeline, ActivityTimelineItem } from "@/src/components/ActivityTimeline";
import { Button } from "@/src/components/Button";
import { PaperPlaneIcon, RejectIcon } from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { useQuoteComentarios } from "../hooks/useQuoteComentarios";
import type { QuoteDetailSource } from "../services/actions";
import type { QuoteComentarioTipo } from "../interfaces/quote.interface";

const TIPO_CONFIG: Record<
  QuoteComentarioTipo,
  { label: string; Icon: typeof RejectIcon }
> = {
  RECHAZO: { label: "Rechazo", Icon: RejectIcon },
  REENVIO: { label: "Reenvío a revisión", Icon: PaperPlaneIcon },
};

const SECTION_CLASS =
  "rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5";

interface QuoteComentariosHistoryProps {
  quoteId: number;
  source?: QuoteDetailSource;
}

/**
 * Historial de rechazos y reenvíos a revisión de una cotización. Hace su
 * propia consulta y resuelve sus propios estados: si falla, solo esta sección
 * muestra el error; el resto del detalle sigue en pantalla.
 */
export function QuoteComentariosHistory({ quoteId, source }: QuoteComentariosHistoryProps) {
  const { data, isLoading, isInitialError, isDefinitiveError, isFetching, refetch } =
    useQuoteComentarios(quoteId, source);

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-2" role="status" aria-live="polite" aria-label="Cargando historial">
          <LoadingSkeleton className="h-10 rounded-lg" />
          <LoadingSkeleton className="h-10 rounded-lg" />
        </div>
      );
    }
    if (isDefinitiveError) {
      return (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          El historial de esta cotización no está disponible.
        </p>
      );
    }
    if (isInitialError) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            No se pudo cargar el historial de la cotización.
          </p>
          <Button type="button" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Reintentando…" : "Reintentar"}
          </Button>
        </div>
      );
    }
    if (!data || data.length === 0) {
      return (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Sin rechazos ni reenvíos registrados.
        </p>
      );
    }
    return (
      <ActivityTimeline ariaLabel="Historial de rechazos y reenvíos">
        {data.map((entry) => {
          const { label, Icon } = TIPO_CONFIG[entry.tipo] ?? TIPO_CONFIG.RECHAZO;
          return (
            <ActivityTimelineItem
              key={entry.id}
              icon={<Icon className="w-4 h-4" aria-hidden="true" />}
              title={label}
              meta={
                <>
                  <span>{entry.autor_nombre || "Usuario sin nombre"}</span>
                  <span>{formatShortDateTime(entry.created_at)}</span>
                </>
              }
            >
              {entry.comentario?.trim() ? (
                <p className="whitespace-pre-wrap wrap-break-word">{entry.comentario}</p>
              ) : null}
            </ActivityTimelineItem>
          );
        })}
      </ActivityTimeline>
    );
  };

  return (
    <section className={SECTION_CLASS} aria-label="Historial de la cotización">
      <p className="text-xs uppercase text-slate-400 font-semibold mb-3">Historial</p>
      {renderBody()}
    </section>
  );
}
