"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { ErrorDisplay } from "@/src/components/ui/ErrorDisplay";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type { BitacoraDocumento } from "../interfaces/document-audit.interface";
import { getTipoDocumentoLabel } from "../constants/documentAuditValues";
import type { DocumentAuditTarget } from "../constants/documentAuditOpeners";
import {
  formatAuditDateTime,
  formatAuditUser,
  formatStatusChange,
} from "../utils/documentAuditFormat";
import { DocumentAuditActionIcon } from "./DocumentAuditActionIcon";

const CELL = "px-4 py-2.5 align-top";
const FOLIO_LINK_CLS =
  "font-mono font-medium hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

interface DocumentAuditTableProps {
  rows: BitacoraDocumento[];
  /** Destino de cada evento (`resolveDocumentAuditTarget`), o `null` = texto. */
  getTarget: (event: BitacoraDocumento) => DocumentAuditTarget | null;
  /** Abre en diálogo un documento con `kind: "dialog"`; el estado vive en la vista. */
  onOpenDialog: (target: DocumentAuditTarget) => void;
  /** Nombre de la sucursal por id; `null` si no se conoce. */
  getBranchName: (sucursalId: number) => string | null;
  /** Código ISO de la moneda por id; `null` si no se conoce (el importe va sin símbolo). */
  getCurrencyCode: (monedaId: number) => string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
  /** Filas de otra combinación de filtros mientras llega la nueva. */
  isTransitioning: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const COLUMNS: { label: string; align?: "right" }[] = [
  { label: "Acción" },
  { label: "Fecha y hora" },
  { label: "Tipo" },
  { label: "Folio" },
  { label: "Usuario" },
  { label: "Sucursal" },
  { label: "Total", align: "right" },
];

/**
 * Tabla de la bitácora. No es `DataTable`: esa tabla busca, filtra, ordena y
 * pagina EN MEMORIA, y aquí solo están las filas cargadas hasta ahora (la lista
 * crece con "Cargar más" siguiendo el cursor, sin total). Toda búsqueda o
 * filtro sobre esas filas mentiría sobre el conjunto; los filtros van por
 * encima, contra el backend.
 *
 * El encabezado queda montado en todos los estados: la carga, el error y el
 * vacío se pintan en el cuerpo, como en `DataTable`.
 */
export function DocumentAuditTable({
  rows,
  getTarget,
  onOpenDialog,
  getBranchName,
  getCurrencyCode,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isTransitioning,
  hasActiveFilters,
  onClearFilters,
}: DocumentAuditTableProps) {
  const renderBodyState = (content: ReactNode) => (
    <tr>
      <td colSpan={COLUMNS.length} className="p-4">
        {content}
      </td>
    </tr>
  );

  let body: ReactNode;
  if (isError) {
    body = renderBodyState(
      <ErrorDisplay
        title="Error al cargar la bitácora"
        message={errorMessage}
        onRetry={onRetry}
        secondaryAction={
          hasActiveFilters ? { label: "Limpiar filtros", onClick: onClearFilters } : undefined
        }
      />,
    );
  } else if (isLoading) {
    body = renderBodyState(
      <div role="status" aria-live="polite" aria-label="Cargando bitácora">
        <LoadingSkeleton className="h-96 rounded-2xl" />
      </div>,
    );
  } else if (rows.length === 0) {
    body = renderBodyState(
      <div className="py-12 text-center space-y-1">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {hasActiveFilters
            ? "No hay eventos que coincidan con los filtros."
            : "Todavía no hay eventos registrados."}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          La bitácora solo contiene los cambios hechos desde que se activó; no incluye la historia
          anterior de los documentos.
        </p>
      </div>,
    );
  } else {
    body = rows.map((event) => {
      const statusChange = formatStatusChange(event.estatus_anterior, event.estatus_nuevo);
      const target = getTarget(event);
      const folioText = textOrDash(event.folio);
      const branchName = event.sucursal_id !== null ? getBranchName(event.sucursal_id) : null;
      const total = event.total !== null ? Number(event.total) : null;
      return (
        <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
          <td className={CELL}>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-slate-400 dark:text-slate-500">
                <DocumentAuditActionIcon accion={event.accion} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {event.accion_display || event.accion}
                </p>
                {statusChange && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{statusChange}</p>
                )}
              </div>
            </div>
          </td>
          <td className={`${CELL} whitespace-nowrap tabular-nums`}>
            {formatAuditDateTime(event.created_at)}
          </td>
          <td className={CELL}>{getTipoDocumentoLabel(event.tipo_documento)}</td>
          <td className={`${CELL} whitespace-nowrap`}>
            {/* Un pedido abre `/orders/[id]` con el enlace de folio de pedido del
                proyecto (`PedidoFolioLink`); su origen hace que "Volver" regrese
                aquí. Los demás tipos usan su página o su diálogo. */}
            {target?.tipo === "pedido" ? (
              <PedidoFolioLink
                pedidoId={target.id}
                folio={event.folio.trim() !== "" ? event.folio : null}
                from="document-audit"
                className="font-mono font-medium"
              />
            ) : target?.opener.kind === "route" ? (
              <Link href={target.opener.href(target.id)} title="Ver detalle" className={FOLIO_LINK_CLS}>
                {folioText}
              </Link>
            ) : target?.opener.kind === "dialog" ? (
              <button
                type="button"
                title="Ver detalle"
                onClick={() => onOpenDialog(target)}
                className={FOLIO_LINK_CLS}
              >
                {folioText}
              </button>
            ) : (
              <span className="font-mono">{folioText}</span>
            )}
          </td>
          <td className={CELL}>{formatAuditUser(event.usuario_nombre)}</td>
          <td className={CELL}>{branchName ?? "—"}</td>
          <td className={`${CELL} text-right tabular-nums whitespace-nowrap`}>
            {total !== null && Number.isFinite(total)
              ? formatCurrency(total, event.moneda_id !== null ? getCurrencyCode(event.moneda_id) : null)
              : "—"}
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="relative w-full rounded-2xl border border-slate-200 dark:border-white/20 shadow-sm bg-white dark:bg-black overflow-x-auto">
      <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200 border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`px-4 py-2.5 font-semibold whitespace-nowrap ${
                  column.align === "right" ? "text-right" : ""
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={`divide-y divide-slate-100 dark:divide-slate-800 ${
            isTransitioning ? "opacity-60 transition-opacity" : ""
          }`}
          aria-busy={isTransitioning || isLoading}
        >
          {body}
        </tbody>
      </table>
    </div>
  );
}
