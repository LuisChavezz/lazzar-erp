"use client";

import { ChevronRightIcon, TraspasosIcon, WarehouseIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
} from "@/src/components/DetailDialogPrimitives";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { TRANSFER_STATUS_CONFIG } from "../constants/transferStatus";
import { useTransferenciaDetail } from "../hooks/useTransferenciaDetail";
import type { TransferenciaDetalleLine } from "../interfaces/stock-transfer.interface";

/** Nombre del producto/variante trasladado en una línea. Solo uno de los dos
 *  pares viaja no-nulo por línea, nunca ambos. */
function lineaProductoNombre(linea: TransferenciaDetalleLine): string {
  return linea.producto_variante_nombre ?? linea.producto_nombre ?? "—";
}

const LineasTable = ({ items }: { items: TransferenciaDetalleLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Este traspaso no tiene líneas registradas.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Producto / Variante</th>
          <th className="px-3 py-2 font-medium text-right">Cantidad</th>
          <th className="px-3 py-2 font-medium">Ubicación origen</th>
          <th className="px-3 py-2 font-medium">Ubicación destino</th>
        </>
      }
    >
      {items.map((linea) => (
        <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {lineaProductoNombre(linea)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatExactQuantityValue(linea.cantidad)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.ubicacion_origen_nombre ?? "—"}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.ubicacion_destino_nombre ?? "—"}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

interface StockTransferDetailDialogProps {
  /** ID del traspaso a consultar. `0` mantiene la consulta deshabilitada. */
  transferId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockTransferDetailDialog({
  transferId,
  open,
  onOpenChange,
}: StockTransferDetailDialogProps) {
  const { data, isLoading, isError, error } = useTransferenciaDetail(transferId);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <TraspasosIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Traspaso
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {data ? data.folio : isError ? "Error al cargar" : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {/* ── Estado: cargando ──────────────────────────────────────────────── */}
      {isLoading && <Loader title="Cargando detalle del traspaso..." className="py-16" />}

      {/* ── Estado: error ─────────────────────────────────────────────────── */}
      {isError && (
        <ErrorState
          title="Error al cargar el detalle del traspaso"
          message={(error as Error)?.message}
        />
      )}

      {/* ── Estado: datos cargados ────────────────────────────────────────── */}
      {!isLoading && !isError && data && (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Estatus">
              <StatusBadge status={data.status} config={TRANSFER_STATUS_CONFIG} />
            </InfoField>
            <InfoField label="Fecha">
              <span className="tabular-nums">
                {formatShortDate(data.fecha_creacion)} · {formatShortTime(data.fecha_creacion)}
              </span>
            </InfoField>
            <InfoField label="Usuario">{data.usuario_nombre}</InfoField>
            {data.observaciones && (
              <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
                {data.observaciones}
              </InfoField>
            )}
          </div>

          {/* Almacenes */}
          <div>
            <SectionTitle>Almacenes</SectionTitle>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <WarehouseIcon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {data.almacen_origen_nombre}
                </span>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <WarehouseIcon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {data.almacen_destino_nombre}
                </span>
              </div>
            </div>
          </div>

          {/* Líneas */}
          <div>
            <SectionTitle>Líneas del traspaso</SectionTitle>
            <LineasTable items={data.transferencia_detalle} />
          </div>
        </div>
      )}
    </MainDialog>
  );
}
