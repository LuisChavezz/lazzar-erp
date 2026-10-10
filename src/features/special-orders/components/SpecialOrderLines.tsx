"use client";

import { Button } from "@/src/components/Button";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
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

interface SpecialOrderLinesProps {
  detalles: SpecialOrderLine[];
  /**
   * El usuario puede ver la acción de alta de SKU. Es solo visibilidad: quién
   * puede ejecutarla lo decide el backend (ver `SpecialOrderPageContent`).
   */
  canGenerateSkus: boolean;
  /** Abre el alta de SKU + BOM de la línea. El diálogo lo tiene la página. */
  onGenerateSkus: (line: SpecialOrderLine) => void;
}

/**
 * Estado del alta de SKU de la línea, en tres casos:
 *  - Ninguna talla tiene SKU: la acción de alta (si el usuario la ve y hay
 *    tallas con cantidad; sin ellas el backend la rechazaría).
 *  - Todas las tallas con cantidad tienen SKU: "SKU generados".
 *  - Hay SKU pero alguna talla con cantidad no lo tiene: "SKU incompletos".
 *    El alta es todo-o-nada, así que esto solo pasa si la talla se agregó (o
 *    ganó cantidad) DESPUÉS del alta. No se ofrece la acción: el backend no
 *    admite una segunda alta sobre la misma línea.
 */
function LineSkuStatus({
  line,
  canGenerateSkus,
  onGenerateSkus,
}: {
  line: SpecialOrderLine;
  canGenerateSkus: boolean;
  onGenerateSkus: (line: SpecialOrderLine) => void;
}) {
  const tallasConCantidad = line.tallas.filter((talla) => Number(talla.cantidad) > 0);

  if (line.tallas.some((talla) => Boolean(talla.sku_produccion))) {
    const tallasSinSku = tallasConCantidad.filter((talla) => !talla.sku_produccion);

    if (tallasSinSku.length > 0) {
      const nombres = tallasSinSku.map((talla) => talla.talla_nombre || "—").join(", ");
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="inline-flex items-center rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            SKU incompletos
          </span>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 text-right">
            Sin SKU ni lista de materiales: {nombres}
          </p>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        SKU generados
      </span>
    );
  }

  if (!canGenerateSkus || tallasConCantidad.length === 0) return null;

  return (
    <Button variant="primary" rounded="full" onClick={() => onGenerateSkus(line)}>
      Generar SKU y BOM
    </Button>
  );
}

/**
 * Líneas de muestra del pedido: una tarjeta por línea (producto externo +
 * color · total de piezas) con su tabla de tallas. Patrón de `PedidoLineas`,
 * sin precios ni picking — este contrato no los trae. Cada talla muestra su SKU
 * de producción y cada tarjeta, el estado del alta de SKU de la línea.
 */
export function SpecialOrderLines({
  detalles,
  canGenerateSkus,
  onGenerateSkus,
}: SpecialOrderLinesProps) {
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
          {/* Fila SIN wrap: la descripción ocupa el espacio restante y parte su
              texto en su propia columna; el grupo derecho no se encoge ni baja,
              y se alinea arriba para quedar a la altura de la primera línea.
              Bajo `sm` el grupo derecho (~240px) no deja columna útil para el
              texto en una tarjeta de teléfono, así que ocupa su propia primera
              fila, pegado a la derecha, y la descripción va debajo a todo el
              ancho (`flex-col-reverse`: el orden del DOM no cambia). */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
                {line.producto_nombre_externo || "—"}
              </span>
              {line.color_nombre && (
                <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                  {line.color_nombre}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
              <LineSkuStatus
                line={line}
                canGenerateSkus={canGenerateSkus}
                onGenerateSkus={onGenerateSkus}
              />
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
                  {formatQuantityValue(totalPiezas(line.tallas))} pzas
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {line.tallas.length} talla{line.tallas.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3">
            {line.tallas.length === 0 ? (
              <EmptyLines>Esta línea no tiene tallas.</EmptyLines>
            ) : (
              // Tabla propia y NO `LineItemsTable`: ese chrome acota el alto a
              // `max-h-72` con scroll interno, correcto en un diálogo y lo
              // contrario de lo que quiere una página (mismo criterio que
              // `CorteMangaOrderPageContent`). Aquí las tallas se leen de corrido.
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr className="text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2 text-left font-semibold">Talla</th>
                      <th className="px-3 py-2 text-left font-semibold">SKU</th>
                      <th className="px-3 py-2 text-left font-semibold">Servicios</th>
                      <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {line.tallas.map((talla) => (
                      <tr
                        key={talla.id}
                        className="border-t border-slate-100 dark:border-white/10 align-top hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">
                          {talla.talla_nombre || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200">
                          {talla.sku_produccion || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <TallaServices talla={talla} line={line} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                          {formatQuantityValue(talla.cantidad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
