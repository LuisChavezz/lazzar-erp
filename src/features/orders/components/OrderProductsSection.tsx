"use client";

import { getTipoPedidoConfig, TIPO_PEDIDO } from "../constants/pedidoStatus";
import type { PedidoDetalleLinea } from "../interfaces/order.interface";
import { centsToDecimalString, summarizeLinePrice } from "../utils/orderAccounting";
import {
  anyLineHasService,
  isSampleLine,
  lineProductName,
  lineSizesSummary,
} from "../utils/orderLines";
import { useOrderMoney } from "./OrderCurrencyContext";
import { OrderLineServiceCell } from "./OrderLineServiceCell";
import { SheetSection } from "./OrderSheetPrimitives";

const TH = "p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider";

/**
 * Precio de la línea: el de sus tallas cuando todas coinciden; "Varía" con el
 * precio de cada talla en el tooltip cuando no (caso que no aparece en los
 * datos actuales; en ese caso la columna Importe tampoco se publica).
 */
function LinePriceCell({
  linea,
  formatMoney,
}: {
  linea: PedidoDetalleLinea;
  formatMoney: (value: string | null | undefined) => string;
}) {
  const price = summarizeLinePrice(linea);
  if (price.kind === "uniform") return <>{formatMoney(price.value)}</>;
  const detail = price.bySize.map((size) => `${size.talla}: ${formatMoney(size.precio)}`).join(", ");
  return (
    <span
      className="cursor-help underline decoration-dotted underline-offset-2"
      title={`Precio por talla: ${detail}`}
      aria-label={`Varía. Precio por talla: ${detail}`}
    >
      Varía
    </span>
  );
}

interface OrderProductsSectionProps {
  detalles: PedidoDetalleLinea[];
  showAccounting: boolean;
  /**
   * Importe por línea en centavos, o `null` para no mostrar la columna. Solo
   * llega con datos contables y cuando la suma concilia con el `subtotal` del
   * pedido (ver `reconciledLineAmounts`).
   */
  lineAmounts: Record<number, number> | null;
}

/**
 * "Detalle de Productos" con las columnas y la agrupación de la tabla de la
 * cotización: una fila por producto+color (cada `detalles[]` del pedido ya es
 * exactamente eso) y las tallas resumidas en una celda.
 *
 * Diferencias deliberadas con el formulario:
 * - Sin "Desc %": el pedido no guarda descuento por renglón (solo
 *   `descuento_global` en la cabecera).
 * - "Importe" solo cuando concilia: el backend no lo da (sus subtotales por
 *   línea y por talla llegan siempre en cero y aquí NO se leen), así que se
 *   calcula por talla y se publica únicamente si la suma de todas las líneas
 *   cuadra con el `subtotal` del pedido. Si no, la columna no existe para ese
 *   pedido (sin mensaje).
 * - "Precio" solo con datos contables; sin ellos la columna no existe (ni
 *   vacía ni con guiones). Es el `precio_unitario` de la línea, que coincide con
 *   el de todas sus tallas en los datos revisados.
 * - "Cambio Talla": el formulario no tiene esa columna, pero la página
 *   anterior sí mostraba ese servicio por talla; aparece solo en los pedidos
 *   donde alguna talla lo lleva.
 * - Nada de surtido: eso vive en la hoja de Avances.
 */
export function OrderProductsSection({
  detalles,
  showAccounting,
  lineAmounts,
}: OrderProductsSectionProps) {
  const { formatMoney } = useOrderMoney();
  // Mismo badge que la tabla de captura de la cotización y que la columna
  // "Tipo" del listado, para que todas las vistas nombren igual a la muestra.
  const muestraBadge = getTipoPedidoConfig(TIPO_PEDIDO.MUESTRA);
  const totalPiezas = detalles.reduce((sum, linea) => sum + (linea.cantidad_total ?? 0), 0);
  const showCambioTalla = anyLineHasService(detalles, "lleva_cambio_talla");
  const showImporte = showAccounting && lineAmounts !== null;
  const columnCount = 9 + (showCambioTalla ? 1 : 0) + (showAccounting ? 1 : 0) + (showImporte ? 1 : 0);

  return (
    <SheetSection title="Detalle de Productos">
      <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8 pb-2 border-b border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-225 border-collapse text-left">
          <caption className="sr-only">Partidas del pedido</caption>
          <thead className="bg-slate-50/95 dark:bg-zinc-900/95">
            <tr>
              <th className={`${TH} w-10 text-center`}>#</th>
              <th className={`${TH} w-24`}>SKU</th>
              <th className={`${TH} min-w-40`}>Descripción</th>
              <th className={`${TH} w-32`}>Color</th>
              <th className={`${TH} w-56`}>Tallas</th>
              <th className={`${TH} w-20 text-center`}>Bordado</th>
              <th className={`${TH} w-20 text-center`}>Reflejante</th>
              <th className={`${TH} w-24 text-center`}>Corte Manga</th>
              {showCambioTalla && <th className={`${TH} w-24 text-center`}>Cambio Talla</th>}
              <th className={`${TH} w-24 text-right`}>Cantidad</th>
              {showAccounting && <th className={`${TH} w-24 text-right`}>Precio</th>}
              {showImporte && <th className={`${TH} w-28 text-right`}>Importe</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {detalles.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="p-6 text-center text-sm italic text-slate-400 dark:text-slate-500"
                >
                  Este pedido no tiene líneas de producto.
                </td>
              </tr>
            ) : (
              detalles.map((linea, index) => (
                <tr key={linea.id} className="align-top">
                  <td className="p-2 text-center text-xs text-slate-400 select-none">{index + 1}</td>
                  <td className="p-2">
                    {isSampleLine(linea) ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${muestraBadge.className}`}
                      >
                        {muestraBadge.label}
                      </span>
                    ) : linea.sku_base ? (
                      <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {linea.sku_base}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-2 text-xs text-slate-600 dark:text-slate-300">
                    {lineProductName(linea)}
                  </td>
                  <td className="p-2">
                    {linea.color_nombre ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className="shrink-0 w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 shadow-sm"
                          style={{ backgroundColor: linea.color_codigo_hex ?? "#e5e7eb" }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-24">
                          {linea.color_nombre}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-2 text-xs text-slate-500 dark:text-slate-400 whitespace-normal wrap-break-word">
                    {lineSizesSummary(linea)}
                  </td>
                  <td className="p-2 text-center">
                    <OrderLineServiceCell linea={linea} flag="lleva_bordado" serviceLabel="bordado" />
                  </td>
                  <td className="p-2 text-center">
                    <OrderLineServiceCell linea={linea} flag="lleva_reflejante" serviceLabel="reflejante" />
                  </td>
                  <td className="p-2 text-center">
                    <OrderLineServiceCell linea={linea} flag="lleva_corte_manga" serviceLabel="corte de manga" />
                  </td>
                  {showCambioTalla && (
                    <td className="p-2 text-center">
                      <OrderLineServiceCell linea={linea} flag="lleva_cambio_talla" serviceLabel="cambio de talla" />
                    </td>
                  )}
                  <td className="p-2 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    {linea.cantidad_total}
                  </td>
                  {showAccounting && (
                    <td className="p-2 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <LinePriceCell linea={linea} formatMoney={formatMoney} />
                    </td>
                  )}
                  {/* `lineAmounts` no nulo ⇒ trae TODAS las líneas del pedido. */}
                  {showImporte && lineAmounts && (
                    <td className="p-2 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatMoney(centsToDecimalString(lineAmounts[linea.id]))}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 pt-2 flex items-center justify-between gap-4 text-xs text-slate-400">
        <span>
          {detalles.length} partida{detalles.length === 1 ? "" : "s"}
        </span>
        <span className="tabular-nums">{totalPiezas} pzas</span>
      </div>
    </SheetSection>
  );
}
