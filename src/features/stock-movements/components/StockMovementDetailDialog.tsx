"use client";

import { HistoryIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { useStockMovementDetail } from "@/src/features/stock-movements/hooks/useStockMovementDetail";
import { MOVEMENT_TYPE_CONFIG } from "./StockMovementsColumns";
import type { StockMovementDetailItem } from "@/src/features/stock-movements/interfaces/stock-movements.interface";

// ── Helpers de formato ────────────────────────────────────────────────────────

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Sub-componentes ────────────────────────────────────────────────────────────

const InfoField = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <span className="text-slate-400 dark:text-slate-500">{label}</span>
    <div className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{children}</div>
  </div>
);

const DetalleTable = ({ items }: { items: StockMovementDetailItem[] }) => {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-4 text-center">
        Este movimiento no tiene líneas de detalle.
      </p>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Producto</th>
            <th className="px-3 py-2 font-medium text-right">Cant. Antes</th>
            <th className="px-3 py-2 font-medium text-right">Cant. Final</th>
            <th className="px-3 py-2 font-medium text-right">Delta</th>
            <th className="px-3 py-2 font-medium text-right">Ubicación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {items.map((item, index) => {
            const roundedDelta = Math.round(parseFloat(item.delta));
            const deltaPositive = roundedDelta >= 0;
            return (
              <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                  {item.producto_nombre}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {Math.round(parseFloat(item.cantidad_before))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {Math.round(parseFloat(item.cantidad_after))}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-semibold ${
                    deltaPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {deltaPositive ? `+${roundedDelta}` : roundedDelta}
                </td>
                <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                  {item.ubicacion_nombre ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ── Componente principal del diálogo ──────────────────────────────────────────

interface StockMovementDetailDialogProps {
  /** ID del movimiento a consultar. `0` mantiene la consulta deshabilitada. */
  movementId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDetailDialog({
  movementId,
  open,
  onOpenChange,
}: StockMovementDetailDialogProps) {
  const { data, isLoading, isError, error } = useStockMovementDetail(movementId);

  const tipoCfg = data
    ? (MOVEMENT_TYPE_CONFIG[data.tipo_movimiento] ?? null)
    : null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <HistoryIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Movimiento
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {data ? data.tipo_movimiento : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {/* ── Estado: cargando ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          <span className="ml-3 text-sm text-slate-500">
            Cargando detalle del movimiento...
          </span>
        </div>
      )}

      {/* ── Estado: error ─────────────────────────────────────────────────── */}
      {isError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Error al cargar el detalle del movimiento
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            {(error as Error)?.message ?? "Intenta nuevamente más tarde."}
          </p>
        </div>
      )}

      {/* ── Estado: datos cargados ────────────────────────────────────────── */}
      {!isLoading && !isError && data && (
        <div className="space-y-5">
          {/* Información general */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Tipo de movimiento">
              {tipoCfg ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${tipoCfg.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tipoCfg.dot}`} />
                  {tipoCfg.label}
                </span>
              ) : (
                data.tipo_movimiento
              )}
            </InfoField>
            <InfoField label="Fecha">{formatDateTime(data.fecha)}</InfoField>
            <InfoField label="Usuario">{data.usuario_nombre}</InfoField>
            <InfoField label="Almacén">{data.almacen_nombre}</InfoField>
            <InfoField label="Sucursal">{data.sucursal_nombre}</InfoField>
            <InfoField label="Empresa">{data.empresa_nombre}</InfoField>
            <InfoField label="Total de movimientos" className="col-span-2 sm:col-span-1">
              <span className="tabular-nums font-semibold text-slate-800 dark:text-white">
                {data.detalle_count}
              </span>
            </InfoField>
          </div>

          {/* Líneas de detalle */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Líneas de movimiento
            </h3>
            <DetalleTable items={data.detalle} />
          </div>
        </div>
      )}
    </MainDialog>
  );
}
