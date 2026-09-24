"use client";

import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { TallaServiceChips } from "@/src/features/orders/components/TallaServiceChips";
import { cleanText } from "@/src/utils/cleanText";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "../interfaces/special-order.interface";

/**
 * Servicios de UNA talla: los chips compartidos con el detalle de pedido
 * (`TallaServiceChips`, que decide solo por las banderas `lleva_*`, nunca
 * muestra el `tipo` de corte de manga ni interpreta `cambio_talla_config`) más,
 * solo aquí, las notas del bordado cuando las hay.
 */
function TallaServices({
  talla,
  line,
}: {
  talla: SpecialOrderTalla;
  line: SpecialOrderLine;
}) {
  // `typeof` y no solo `cleanText`: el config es JSON libre y `notas` podría no
  // ser texto.
  const notas = talla.bordado_config?.notas;
  const notasBordado =
    talla.lleva_bordado && typeof notas === "string" ? cleanText(notas) : null;

  const chips = (
    <TallaServiceChips
      talla={talla}
      productoNombre={line.producto_nombre_externo}
      colorNombre={line.color_nombre}
    />
  );
  if (!notasBordado) return chips;

  return (
    <div className="space-y-1">
      {chips}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
        <span className="text-slate-400 dark:text-slate-500">Notas de bordado: </span>
        {notasBordado}
      </p>
    </div>
  );
}

/**
 * Piezas de la línea. Se descartan los valores no finitos (mismo criterio que
 * `sumarPiezas` en `CorteMangaOrderPageContent`).
 */
const totalPiezas = (tallas: SpecialOrderTalla[]): number =>
  tallas.reduce((acc, talla) => (Number.isFinite(talla.cantidad) ? acc + talla.cantidad : acc), 0);

/**
 * Líneas de muestra del pedido: una tarjeta por línea (producto externo +
 * color · total de piezas) con su tabla de tallas. Patrón de `PedidoLineas`,
 * sin precios ni picking — este contrato no los trae.
 */
export function SpecialOrderLines({ detalles }: { detalles: SpecialOrderLine[] }) {
  if (detalles.length === 0) {
    return <EmptyLines>Este pedido no tiene líneas de muestra.</EmptyLines>;
  }

  return (
    <div className="space-y-4">
      {detalles.map((line) => (
        <div
          key={line.id}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
                {line.producto_nombre_externo || "—"}
              </span>
              {line.color_nombre && (
                <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                  {line.color_nombre}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
                {formatQuantityValue(totalPiezas(line.tallas))} pzas
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {line.tallas.length} talla{line.tallas.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="p-3">
            {line.tallas.length === 0 ? (
              <EmptyLines>Esta línea no tiene tallas.</EmptyLines>
            ) : (
              <LineItemsTable
                head={
                  <>
                    <th className="px-3 py-2 font-semibold">Talla</th>
                    <th className="px-3 py-2 font-semibold">Servicios</th>
                    <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
                  </>
                }
              >
                {line.tallas.map((talla) => (
                  <tr key={talla.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">
                      {talla.talla_nombre || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <TallaServices talla={talla} line={line} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                      {formatQuantityValue(talla.cantidad)}
                    </td>
                  </tr>
                ))}
              </LineItemsTable>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
