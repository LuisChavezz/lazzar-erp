import { EmptyLines, Section, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { StatusBadge } from "@/src/components/StatusBadge";
import { PICKING_STATUS_CONFIG } from "@/src/features/picking/constants/pickingStatus";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type { PedidoFolioPicking } from "../interfaces/order.interface";
import { PICKING_DOC_TIPO, type OpenOrderDocument } from "./orderDocumentDialogs";

/**
 * Timestamp de un folio para ordenar (desc, más reciente primero). `null`
 * cuando la fecha falta o no es parseable — esos van al fondo.
 */
function folioSortTime(folio: PedidoFolioPicking): number | null {
  if (!folio.created_at) return null;
  const time = new Date(folio.created_at).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Historial de pickings del pedido (son parciales y repetibles por talla): la
 * bitácora de surtido.
 *
 * OJO: `total_lineas_completas / total_lineas` describe SOLO ese folio. El
 * avance del PEDIDO es `tracker_picking` y no se reconstruye sumando esta
 * columna.
 */
export function OrderPickingFoliosSection({
  folios,
  onOpenFolio,
}: {
  folios: PedidoFolioPicking[];
  onOpenFolio: (doc: OpenOrderDocument) => void;
}) {
  const ordenados = [...folios].sort((a, b) => {
    const ta = folioSortTime(a);
    const tb = folioSortTime(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });

  return (
    <Section title={`Folios de surtido (${folios.length})`}>
      {folios.length === 0 ? (
        <EmptyLines>Este pedido todavía no tiene surtidos.</EmptyLines>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 dark:bg-white/5">
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 text-left font-semibold">Folio</th>
                <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold">Estado</th>
                <th className="px-3 py-2 text-left font-semibold">Origen → Destino</th>
                <th className="px-3 py-2 text-left font-semibold">Operador</th>
                {/* De ESTE folio, no del pedido — ver la nota del componente. */}
                <th className="px-3 py-2 text-right font-semibold">Líneas</th>
                <th className="px-3 py-2 text-right font-semibold">Asignada</th>
                <th className="px-3 py-2 text-right font-semibold">Surtida</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((folio) => (
                <tr key={folio.id} className="border-t border-slate-100 dark:border-white/10 align-top">
                  <td className="px-3 py-2">
                    {/* Abre el MISMO diálogo por id que "Documentos
                        relacionados". No es un enlace a /wms/...: esa ruta de
                        detalle no existe, y además el módulo WMS exige R-WMS,
                        que un usuario de Ventas no tiene aunque sí pueda ver
                        este pedido (la ruta /orders/[id] es neutra). */}
                    <button
                      type="button"
                      onClick={() => onOpenFolio({ tipo: PICKING_DOC_TIPO, id: folio.id })}
                      className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer font-medium text-left transition-colors whitespace-nowrap"
                      title="Ver detalle del surtido"
                    >
                      {textOrDash(folio.folio)}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatShortDate(folio.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    {/* Mismo mapa de colores que el listado de Picking en WMS:
                        es el mismo enum del mismo modelo. */}
                    <StatusBadge status={folio.estado} config={PICKING_STATUS_CONFIG} />
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    <span className="whitespace-nowrap">{textOrDash(folio.almacen_origen_nombre)}</span>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">→</span>
                    {/* `almacen_destino_nombre` es nullable en el esquema. */}
                    <span className="whitespace-nowrap">{textOrDash(folio.almacen_destino_nombre)}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {textOrDash(folio.operador_nombre)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {folio.total_lineas_completas} / {folio.total_lineas}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatExactQuantityValue(folio.cantidad_asignada_total)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                    {formatExactQuantityValue(folio.cantidad_surtida_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
