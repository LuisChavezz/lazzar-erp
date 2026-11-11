"use client";

import { Button } from "@/src/components/Button";
import { ActivityTimeline, ActivityTimelineItem } from "@/src/components/ActivityTimeline";
import { EmptyLines, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { HistoryIcon, RefreshIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorDisplay } from "@/src/components/ui/ErrorDisplay";
import { DocumentAuditActionIcon } from "@/src/features/document-audit/components/DocumentAuditActionIcon";
import { getTipoDocumentoLabel } from "@/src/features/document-audit/constants/documentAuditValues";
import type { BitacoraDocumento } from "@/src/features/document-audit/interfaces/document-audit.interface";
import {
  formatAuditDateTime,
  formatAuditUser,
  formatStatusChange,
} from "@/src/features/document-audit/utils/documentAuditFormat";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getPedidoEstatusConfig } from "../constants/pedidoStatus";
import type { PedidoDetail } from "../interfaces/order.interface";
import { OrderBadge, SheetSection } from "./OrderSheetPrimitives";

/** Consulta de la línea de tiempo, montada por la página (`useDocumentTimeline`). */
export interface OrderHistoryQuery {
  events: BitacoraDocumento[] | undefined;
  /** El backend devolvió solo los 500 eventos más recientes (`truncado`). */
  isTruncated: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isInitialError: boolean;
  /** 404 de `linea-tiempo`: el historial no está disponible. */
  isDefinitiveError: boolean;
  error: unknown;
  refetch: () => unknown;
}

interface OrderHistorySheetProps {
  pedido: PedidoDetail;
  /**
   * Solo se monta con el permiso de la bitácora confirmado: la página no
   * resuelve esta hoja mientras la sesión carga.
   */
  history: OrderHistoryQuery;
}

/**
 * Hoja 3, "Historial" (EC-854): la línea de tiempo de la bitácora de documentos
 * para este pedido y los documentos que lo tienen como origen directo (OP, OC,
 * órdenes de trabajo, surtido, embarque, facturas, movimientos…), en orden
 * cronológico. Cada evento dice de QUÉ documento es (tipo y folio), para
 * distinguir los del pedido de los de sus derivados.
 *
 * No muestra importes: la bitácora los trae, pero esta hoja no aplica el
 * filtro contable del detalle (`canSeeAccounting`), así que no los repite.
 */
export function OrderHistorySheet({ pedido, history }: OrderHistorySheetProps) {
  const events = history.events;

  let content;
  if (history.isDefinitiveError) {
    content = (
      <EmptyLines>El historial de este pedido no está disponible.</EmptyLines>
    );
  } else if (history.isLoading && events === undefined) {
    content = <Loader title="Cargando historial" message="Obteniendo los eventos del pedido..." />;
  } else if (history.isInitialError) {
    content = (
      <ErrorDisplay
        title="Error al cargar el historial"
        message={extractErrorMessage(history.error, "No se pudo cargar el historial del pedido.")}
        onRetry={() => void history.refetch()}
      />
    );
  } else if (!events || events.length === 0) {
    content = (
      <div className="py-10 text-center space-y-1">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Este pedido aún no tiene eventos registrados.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          La bitácora solo contiene los cambios hechos desde que se activó; no incluye la historia
          anterior del pedido ni de sus documentos.
        </p>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        {history.isTruncated && (
          <p
            role="status"
            className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-300"
          >
            Se muestran los {events.length} eventos más recientes; los anteriores no se incluyen
            en este historial.
          </p>
        )}
        <ActivityTimeline ariaLabel="Historial del pedido">
          {events.map((event) => {
            const statusChange = formatStatusChange(event.estatus_anterior, event.estatus_nuevo);
            return (
              <ActivityTimelineItem
                key={event.id}
                icon={<DocumentAuditActionIcon accion={event.accion} />}
                title={
                  <>
                    <span>{event.accion_display || event.accion}</span>
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      {getTipoDocumentoLabel(event.tipo_documento)}{" "}
                      <span className="font-mono">{textOrDash(event.folio)}</span>
                    </span>
                  </>
                }
                meta={
                  <>
                    <span className="tabular-nums">{formatAuditDateTime(event.created_at)}</span>
                    <span>{formatAuditUser(event.usuario_nombre)}</span>
                  </>
                }
              >
                {statusChange ?? undefined}
              </ActivityTimelineItem>
            );
          })}
        </ActivityTimeline>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Identidad mínima, como en "Avances". */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] font-medium text-slate-900 dark:text-white">
          Historial del pedido{" "}
          <span className="font-mono">{pedido.folio || `#${pedido.id}`}</span>
        </h1>
        <OrderBadge config={getPedidoEstatusConfig(pedido.estatus)} />
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {textOrDash(pedido.cliente_razon_social || pedido.cliente_nombre)}
        </span>
      </div>

      <SheetSection
        icon={<HistoryIcon className="w-5 h-5" aria-hidden="true" />}
        title="Historial"
        subtitle="Altas, cambios de estatus, bajas y borrados del pedido y de sus documentos"
        action={
          events !== undefined ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void history.refetch()}
              disabled={history.isFetching}
              className="inline-flex items-center gap-2"
            >
              <RefreshIcon
                className={`w-4 h-4 ${history.isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Actualizar
            </Button>
          ) : undefined
        }
      >
        {content}
      </SheetSection>
    </div>
  );
}
