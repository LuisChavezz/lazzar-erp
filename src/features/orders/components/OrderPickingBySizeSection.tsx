import { EmptyLines, Section } from "@/src/components/DetailDialogPrimitives";
import { RowProgressBar } from "@/src/components/ProgressPrimitives";
import { formatExactQuantityValue, safeParseAmount } from "@/src/utils/formatCurrency";
import { parsePercentageValue } from "@/src/utils/percentage";
import type { PedidoDetalleLinea } from "../interfaces/order.interface";
import { lineProductName } from "../utils/orderLines";

/**
 * Avance de surtido de UNA LÍNEA (producto+color), compacto, para la cabecera
 * de su tarjeta. Sí se marca `complete`: estos porcentajes del backend SON
 * fracciones acotadas (topadas en `"100.0000"`), así que un 100 sí afirma "esta
 * línea está completa".
 */
function LinePickingTracker({ tracker }: { tracker: PedidoDetalleLinea["tracker_picking"] }) {
  if (!tracker) return null;

  const asignado = parsePercentageValue(tracker.pct_asignado_linea);
  const surtido = parsePercentageValue(tracker.pct_surtido_linea);
  const totalPrendas = formatExactQuantityValue(tracker.total_prendas_linea);

  return (
    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 shrink-0">
          Asignado{" "}
          <span className="tabular-nums">
            ({formatExactQuantityValue(tracker.total_asignado_linea)} / {totalPrendas})
          </span>
        </span>
        <RowProgressBar percentage={asignado} complete={asignado >= 100} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 shrink-0">
          Surtido{" "}
          <span className="tabular-nums">
            ({formatExactQuantityValue(tracker.total_surtido_linea)} / {totalPrendas})
          </span>
        </span>
        <RowProgressBar percentage={surtido} complete={surtido >= 100} />
      </div>
    </div>
  );
}

/**
 * Surtido por línea y por talla: lo pedido, lo asignado y lo surtido (acumulado
 * de TODOS los pickings del pedido para esa talla — son parciales y
 * repetibles), y el avance.
 *
 * El avance de la TALLA no lo da el backend (solo el de la línea y el del
 * pedido): es la razón surtido / pedido, acotada a 100. No es dinero ni se
 * publica como dato del backend; ambos lados son piezas de la misma talla, así
 * que la razón es comparable y un 100 sí significa "talla surtida".
 */
export function OrderPickingBySizeSection({ detalles }: { detalles: PedidoDetalleLinea[] }) {
  return (
    <Section title={`Surtido por producto y talla (${detalles.length})`}>
      {detalles.length === 0 ? (
        <EmptyLines>Este pedido no tiene líneas de producto.</EmptyLines>
      ) : (
        <div className="space-y-4">
          {detalles.map((linea) => (
            <div
              key={linea.id}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {lineProductName(linea)}
                  </span>
                  {linea.color_nombre && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                      {linea.color_codigo_hex && (
                        <span
                          className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                          style={{ backgroundColor: linea.color_codigo_hex }}
                          aria-hidden="true"
                        />
                      )}
                      {linea.color_nombre}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
                    {linea.cantidad_total} pzas
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {linea.tallas.length} talla{linea.tallas.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <LinePickingTracker tracker={linea.tracker_picking} />

              {linea.tallas.length === 0 ? (
                <EmptyLines>Esta línea no tiene tallas.</EmptyLines>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-white/5">
                      <tr className="text-slate-500 dark:text-slate-400">
                        <th className="px-3 py-2 text-left font-semibold">Talla</th>
                        <th className="px-3 py-2 text-left font-semibold">Variante / SKU</th>
                        <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                        <th className="px-3 py-2 text-right font-semibold">Asignado</th>
                        <th className="px-3 py-2 text-right font-semibold">Surtido</th>
                        <th className="px-3 py-2 text-right font-semibold">Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linea.tallas.map((talla) => {
                        const surtida = safeParseAmount(talla.cantidad_surtida_picking);
                        const avance =
                          talla.cantidad > 0 ? Math.min(100, (surtida / talla.cantidad) * 100) : 0;
                        const surtidoCompleto = talla.cantidad > 0 && surtida >= talla.cantidad;
                        return (
                          <tr
                            key={talla.id}
                            className="border-t border-slate-100 dark:border-white/10 align-top"
                          >
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {talla.talla_nombre}
                            </td>
                            <td className="px-3 py-2">
                              <span className="block font-mono text-slate-600 dark:text-slate-300">
                                {talla.variante_sku || "—"}
                              </span>
                              {talla.variante_nombre && (
                                <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-52">
                                  {talla.variante_nombre}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                              {talla.cantidad}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatExactQuantityValue(talla.cantidad_asignada_picking)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${
                                surtidoCompleto
                                  ? "font-semibold text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {formatExactQuantityValue(talla.cantidad_surtida_picking)}
                            </td>
                            <td className="px-3 py-2">
                              <RowProgressBar percentage={avance} complete={surtidoCompleto} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
