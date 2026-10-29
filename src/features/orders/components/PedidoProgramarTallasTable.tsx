"use client";

import {
  EmptyLines,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { plural } from "@/src/utils/plural";
import { getPedidoProgramarServicioLabel } from "../constants/pedidoProgramacion";
import type { PedidoProgramarRenglon } from "../interfaces/pedido-programacion.interface";

/** Por qué una talla no trae stock: el backend manda `null` en ambos casos. */
const sinStockMotivo = (renglon: PedidoProgramarRenglon): string =>
  renglon.es_muestra
    ? "Línea de muestra: no se surte del almacén."
    : "La talla no tiene SKU de catálogo: no hay existencia que consultar.";

interface PedidoProgramarTallasTableProps {
  renglones: PedidoProgramarRenglon[];
  /** Código del almacén del que se surte (`almacen_surtido`), p. ej. "ALM-00". */
  almacenSurtido: string;
}

/**
 * Tallas del pedido con sus servicios y el stock disponible, tal como los
 * calcula `GET /ventas/pedidos/{id}/programar/`. Solo lectura: no se recalcula
 * nada aquí. `stock_disponible`/`faltante` son `null` en las líneas de muestra
 * y en las tallas sin variante, y se muestran como "—" con el motivo.
 */
export function PedidoProgramarTallasTable({
  renglones,
  almacenSurtido,
}: PedidoProgramarTallasTableProps) {
  const tallasConFaltante = renglones.filter((renglon) => (renglon.faltante ?? 0) > 0).length;
  // Sin ninguna talla con stock (todo muestra o sin SKU) no hay nada que resumir.
  const hayTallasConStock = renglones.some((renglon) => renglon.stock_disponible !== null);

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
        <SectionTitle>Tallas del pedido</SectionTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Stock disponible en <span className="font-semibold">{almacenSurtido}</span>,
          descontando lo reservado por otros pedidos.
        </p>
      </div>

      {renglones.length === 0 ? (
        <EmptyLines>El pedido no tiene tallas.</EmptyLines>
      ) : (
        <>
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">Talla</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Servicios</th>
                <th className="px-3 py-2 font-medium text-right">Cantidad</th>
                <th className="px-3 py-2 font-medium text-right">Stock disp.</th>
                <th className="px-3 py-2 font-medium text-right">Faltante</th>
              </>
            }
          >
            {renglones.map((renglon) => {
              const sinStock = renglon.stock_disponible === null;
              const faltante = renglon.faltante ?? 0;
              return (
                <tr
                  key={renglon.pedido_detalle_talla_id}
                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors align-top"
                >
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    <p className="font-medium">{textOrDash(renglon.producto)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {textOrDash(renglon.color)}
                      {renglon.es_muestra && (
                        <span className="ml-1.5 rounded-full bg-violet-100 dark:bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                          Muestra
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{renglon.talla}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {textOrDash(renglon.sku)}
                  </td>
                  <td className="px-3 py-2">
                    {renglon.servicios.length === 0 ? (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {renglon.servicios.map((servicio) => (
                          <span
                            key={servicio}
                            className="rounded-full bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300"
                          >
                            {getPedidoProgramarServicioLabel(servicio)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                    {renglon.cantidad}
                  </td>
                  <td
                    className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200"
                    title={sinStock ? sinStockMotivo(renglon) : undefined}
                  >
                    {sinStock ? (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      renglon.stock_disponible
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      faltante > 0
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                    title={sinStock ? sinStockMotivo(renglon) : undefined}
                  >
                    {renglon.faltante === null ? (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      renglon.faltante
                    )}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
          {hayTallasConStock && (
            <p
              className={`mt-2 text-xs ${
                tallasConFaltante > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {tallasConFaltante > 0
                ? `${tallasConFaltante} ${plural(tallasConFaltante, "talla", "tallas")} sin stock suficiente en ${almacenSurtido}.`
                : `Todas las tallas con SKU tienen stock suficiente en ${almacenSurtido}.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
