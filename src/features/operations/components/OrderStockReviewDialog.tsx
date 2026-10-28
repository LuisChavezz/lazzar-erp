"use client";

import { isAxiosError } from "axios";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/src/components/Button";
import { ErrorState } from "@/src/components/ErrorState";
import {
  FactoryIcon,
  PackageCheckIcon,
  PackageXIcon,
  WarehouseIcon,
} from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { MainDialog } from "@/src/components/MainDialog";
import { useOrderStockDetail } from "@/src/features/orders/hooks/useOrderStockDetail";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type { OrderStockReviewDialogProps } from "../types/order-stock-review.types";
import {
  coverageStyles,
  getGlobalCoverage,
  getLineCoverage,
  getLineMissingUnits,
  getSizeCoverage,
  normalizeStockDetails,
} from "../utils/order-stock-availability.utils";

// Mensaje de error en español: nunca se muestra el texto crudo de axios. La
// ruta no tiene 400 propios; el 404 cubre pedido inexistente, dado de baja o
// de otra empresa.
const getStockDetailErrorMessage = (error: unknown): string =>
  isAxiosError(error) && error.response?.status === 404
    ? "El pedido ya no existe o no está disponible."
    : "No se pudo cargar la existencia del pedido.";

/**
 * Revisión de inventario de un pedido: existencia vs cantidad pedida por línea
 * y talla. Solo lectura. "Solicitar producción" se muestra deshabilitado
 * ("Próximamente"): todavía no existe el flujo, así que nada es seleccionable.
 */
export function OrderStockReviewDialog({
  open,
  onOpenChange,
  orderId,
  folio,
  clientName,
  createdAt,
}: OrderStockReviewDialogProps) {
  // El panel monta el diálogo solo al abrirlo, así que la consulta corre en
  // cada apertura; `open` solo gobierna el Dialog de Radix.
  const { orderStockDetail, isLoading, isError, error } = useOrderStockDetail(orderId);

  // Todo lo de abajo (estado, cobertura, signo, color y texto) lee SOLO los
  // valores normalizados.
  const normalizedStockDetails = normalizeStockDetails(orderStockDetail);

  // `null` cuando no hay tallas que medir (pedido vacío o solo muestras).
  const coverage = getGlobalCoverage(normalizedStockDetails);
  const hasMissingStock = normalizedStockDetails.some((stockDetail) => {
    const lineCoverage = getLineCoverage(stockDetail);
    return lineCoverage === "partial" || lineCoverage === "none";
  });
  const isEmpty = !isLoading && !isError && normalizedStockDetails.length === 0;

  // Resumen para las tarjetas de arriba: partidas cubiertas y piezas faltantes.
  const partidasCubiertas = normalizedStockDetails.filter(
    (stockDetail) => getLineCoverage(stockDetail) === "full",
  ).length;
  const faltanteTotal = normalizedStockDetails.reduce(
    (sum, stockDetail) => sum + getLineMissingUnits(stockDetail),
    0,
  );
  const coverageTone = coverage?.fullyCovered
    ? { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
    : (coverage?.percent ?? 0) >= 50
      ? { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" }
      : { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };

  const createdDate = createdAt ? new Date(createdAt) : null;
  const formattedDate =
    createdDate && isValid(createdDate)
      ? format(createdDate, "d 'de' MMMM yyyy", { locale: es })
      : null;
  const description = [clientName || "—", formattedDate].filter(Boolean).join(" · ");

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={false}
      actionButtonClose={false}
      title={
        <span className="flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Revisión de inventario — {folio || `#${orderId}`}
        </span>
      }
      description={description}
      actionButton={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {/* Solicitar producción: visible pero inactivo hasta que exista el flujo. */}
          {hasMissingStock && !isLoading && !isError && (
            <Button
              variant="primary"
              leftIcon={<FactoryIcon className="w-4 h-4" aria-hidden="true" />}
              disabled
              title="Solicitar producción — próximamente"
            >
              Próximamente
            </Button>
          )}
        </div>
      }
    >
      {/* Resumen en tres tarjetas: skeleton mientras carga; sin tallas que
          medir (pedido vacío o solo muestras) no se pinta. */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <LoadingSkeleton className="h-20 rounded-2xl" />
          <LoadingSkeleton className="h-20 rounded-2xl" />
          <LoadingSkeleton className="h-20 rounded-2xl" />
        </div>
      ) : (
        !isError &&
        coverage !== null && (
          <div className="mb-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cobertura
                </p>
                <p className={`text-2xl font-bold tabular-nums ${coverageTone.text}`}>
                  {coverage.percent}%
                </p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${coverageTone.bar}`}
                    style={{ width: `${coverage.percent}%` }}
                    role="progressbar"
                    aria-valuenow={coverage.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Cobertura de existencia: ${coverage.percent}%`}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Partidas cubiertas
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {partidasCubiertas}
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {" "}de {normalizedStockDetails.length}
                  </span>
                </p>
              </div>
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  faltanteTotal > 0
                    ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10"
                    : "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Piezas faltantes
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    faltanteTotal > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatQuantityValue(faltanteTotal)}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Existencia total en almacenes de la sucursal; no descuenta lo comprometido en otros pedidos.
            </p>
          </div>
        )
      )}

      {/* Renderizado condicional: skeleton de carga → error → sin datos → lista de líneas */}
      {isLoading ? (
        <div className="space-y-4" role="status" aria-label="Cargando detalle de existencias">
          <LoadingSkeleton className="h-20 rounded-2xl" />
          <LoadingSkeleton className="h-56 rounded-2xl" />
          <LoadingSkeleton className="h-56 rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState
          title="No se pudo cargar el detalle de existencias"
          message={getStockDetailErrorMessage(error)}
        />
      ) : isEmpty ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-6 text-center">
          <WarehouseIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Este pedido no tiene partidas
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {normalizedStockDetails.map((stockDetail) => {
            const lineCoverage = getLineCoverage(stockDetail);
            const styles = coverageStyles[lineCoverage];
            const missingUnits = getLineMissingUnits(stockDetail);
            const requiresProduction = lineCoverage === "partial" || lineCoverage === "none";
            const ItemIcon = lineCoverage === "full" ? PackageCheckIcon : PackageXIcon;

            return (
              <section
                key={stockDetail.key}
                className={`rounded-2xl border overflow-hidden ${styles.card}`}
                aria-label={`Detalle de existencia de ${stockDetail.producto}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <ItemIcon className={`w-4 h-4 shrink-0 ${styles.iconClass}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {stockDetail.producto}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Color {stockDetail.color}
                    </p>
                  </div>
                  {missingUnits > 0 && (
                    <span className="rounded-full bg-white/80 dark:bg-black/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300 tabular-nums">
                      Faltan {formatQuantityValue(missingUnits)}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles.badge}`}
                  >
                    {styles.label}
                  </span>
                  {/* Inerte a propósito: el flujo de producción aún no existe. */}
                  {requiresProduction && (
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        readOnly
                        className="w-3.5 h-3.5 rounded border-slate-300 cursor-not-allowed"
                      />
                      Solicitar producción
                    </label>
                  )}
                </div>

                {stockDetail.tallas.length > 0 && (
                  <div className="border-t border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/10 overflow-x-auto">
                    <table
                      className="w-full min-w-96 text-xs"
                      aria-label={`Tallas de ${stockDetail.producto}`}
                    >
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10">
                          <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Talla
                          </th>
                          <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Solicitado
                          </th>
                          <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Existencia
                          </th>
                          <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Diferencia
                          </th>
                          <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {stockDetail.tallas.map((stockSize, sizeIndex) => {
                          const sizeStyles = coverageStyles[getSizeCoverage(stockSize)];

                          return (
                            <tr
                              key={`${stockDetail.key}-${stockSize.talla}-${sizeIndex}`}
                              className={sizeStyles.row}
                            >
                              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-white">
                                {stockSize.talla}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                                {formatQuantityValue(stockSize.cantidad_pedida)}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                                {formatQuantityValue(stockSize.stock_actual)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span
                                  className={`tabular-nums font-bold ${
                                    stockSize.diferencia > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : stockSize.diferencia < 0
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {stockSize.diferencia > 0 ? "+" : ""}
                                  {formatQuantityValue(stockSize.diferencia)}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sizeStyles.badge}`}
                                >
                                  {sizeStyles.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}

          {coverage?.fullyCovered && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2.5 border border-emerald-200/60 dark:border-emerald-700/30 leading-relaxed">
              Todas las partidas tienen existencia suficiente. No es necesario solicitar producción para este pedido.
            </p>
          )}
        </div>
      )}
    </MainDialog>
  );
}
