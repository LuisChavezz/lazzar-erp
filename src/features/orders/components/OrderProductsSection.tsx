"use client";

import { getTipoPedidoConfig, TIPO_PEDIDO } from "../constants/pedidoStatus";
import type { PedidoDetalleLinea } from "../interfaces/order.interface";
import { centsToDecimalString, summarizeLinePrice } from "../utils/orderAccounting";
import {
  anyLineHasService,
  isSampleLine,
  lineProductName,
  lineSizesSummary,
  sampleSkuLineSummary,
  withLinkedSampleSkus,
  type SampleSkuLineStatus,
} from "../utils/orderLines";
import type { SampleSkuLinkBlock } from "../constants/sampleSkuLinking";
import { skuStatusPillClass, type SkuStatusPillTone } from "../constants/skuStatusPills";
import type {
  SampleSkuBulkRun,
  SampleSkuRunLine,
  SampleSkuRunProgress,
} from "../hooks/useSampleSkuLinking";
import { plural } from "@/src/utils/kpiFormat";
import { SampleSkuLinkBanner } from "./SampleSkuLinkBanner";
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
  /** Vinculación de SKU de muestra (indicadores por línea y aviso del pedido). */
  sampleSkus: OrderSampleSkusProps;
}

/**
 * Lo que la sección necesita de la vinculación de SKU de muestra. El estado
 * (corrida en curso, avance, superposición) vive en la página
 * (`useSampleSkuLinking`); aquí solo se pinta.
 */
export interface OrderSampleSkusProps {
  /**
   * Abre el diálogo de SKU de muestra de la línea. Se pasa el id y no la línea:
   * el diálogo y su estado viven en la página, que la resuelve del detalle
   * vigente.
   */
  onOpen: (lineaId: number) => void;
  /** Motivo por el que el usuario no ve las acciones, o `null` si las ve. */
  block: SampleSkuLinkBlock | null;
  /** Líneas de la corrida de "Vincular todas" en curso; vacío si no hay. */
  runningLineaIds: number[];
  /** Avance global de esa corrida. */
  runProgress: SampleSkuRunProgress | null;
  /** Lo que la última corrida hizo en cada línea, por id de línea. */
  bulkRuns: Readonly<Record<number, SampleSkuBulkRun>>;
  /**
   * SKU recién vinculados (id de talla → SKU) que el detalle en caché todavía
   * no trae; se superponen para que los indicadores avancen durante la corrida
   * (ver `withLinkedSampleSkus`).
   */
  linkedSkus: Readonly<Record<number, string>>;
  /** Hay una vinculación individual en curso. */
  hasPendingSingle: boolean;
  /** Lanza UNA corrida sobre las tallas indicadas de varias líneas. */
  onLinkAll: (lines: SampleSkuRunLine[]) => void;
}

/** Presentación del indicador por estado de la línea. */
const LINE_STATUS_TONE: Record<SampleSkuLineStatus, SkuStatusPillTone> = {
  empty: "slate",
  review: "amber",
  linkable: "sky",
  linked: "emerald",
  none: "slate",
};

/**
 * Indicador de una línea de MUESTRA en la columna SKU. Dice el estado de
 * vinculación de la línea (ver `sampleSkuLineSummary`), para saber qué hay que
 * hacer sin abrirla:
 *
 * - "Revisar": alguna talla está por revisar.
 * - "Por vincular · k": k tallas listas para vincular.
 * - "Vinculada n/m": de las m tallas con SKU de producción, n vinculadas (todas).
 * - "Sin SKU": Producción aún no genera SKU para ninguna talla.
 * - "Sin tallas": la línea no tiene tallas capturadas.
 * - "Vinculando · n/m", latiendo: una corrida de "Vincular todas" la incluye.
 *
 * Todos los estados usan la MISMA pastilla (`skuStatusPillClass`): al entrar o
 * salir de una corrida solo cambian el color y el latido, no el tamaño.
 *
 * Es un botón para TODOS los usuarios: abre el diálogo por talla, que sin
 * permiso es de solo lectura.
 *
 * El texto va en UN solo nodo. El botón es `inline-flex`, y cada hijo de un
 * contenedor flex es su propio bloque: partido en dos, el espacio que abre el
 * segundo ("· 1/1") quedaba al inicio de su bloque y se colapsaba ("Muestra· 1/1").
 */
function SampleSkuIndicator({
  linea,
  kindLabel,
  isLinking,
  onOpen,
}: {
  linea: PedidoDetalleLinea;
  /** Nombre del tipo de línea ("Muestra"), para el tooltip. */
  kindLabel: string;
  isLinking: boolean;
  onOpen: (lineaId: number) => void;
}) {
  const { status, withSku, linked, linkableIds, withoutSku } = sampleSkuLineSummary(linea);
  const label = isLinking
    ? `Vinculando · ${linked}/${withSku}`
    : status === "review"
      ? "Revisar"
      : status === "linkable"
        ? `Por vincular · ${linkableIds.length}`
        : status === "linked"
          ? `Vinculada ${linked}/${withSku}`
          : status === "empty"
            ? "Sin tallas"
            : "Sin SKU";
  const tooltip = [
    `Línea de ${kindLabel.toLowerCase()}`,
    status === "empty"
      ? "sin tallas capturadas"
      : withSku > 0
        ? `${linked} de ${withSku} ${plural(withSku, "talla con SKU vinculada", "tallas con SKU vinculadas")}`
        : "Producción aún no genera el SKU",
    ...(withSku > 0 && withoutSku > 0
      ? [`${withoutSku} ${plural(withoutSku, "talla", "tallas")} sin SKU de producción`]
      : []),
    ...(isLinking ? ["vinculando"] : status === "review" ? ["hay tallas por revisar"] : []),
  ].join(" · ");
  return (
    <button
      type="button"
      onClick={() => onOpen(linea.id)}
      title={`${tooltip}. Ver detalle por talla`}
      aria-label={`${label}. ${tooltip}. Ver detalle por talla`}
      className={`whitespace-nowrap tabular-nums cursor-pointer transition-shadow hover:ring-1 hover:ring-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
        isLinking
          ? `${skuStatusPillClass("violet")} animate-pulse`
          : skuStatusPillClass(LINE_STATUS_TONE[status])
      }`}
    >
      {label}
    </button>
  );
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
  sampleSkus,
}: OrderProductsSectionProps) {
  const { formatMoney } = useOrderMoney();
  // Mismo badge que la tabla de captura de la cotización y que la columna
  // "Tipo" del listado, para que todas las vistas nombren igual a la muestra.
  const muestraBadge = getTipoPedidoConfig(TIPO_PEDIDO.MUESTRA);
  const totalPiezas = detalles.reduce((sum, linea) => sum + (linea.cantidad_total ?? 0), 0);
  const showCambioTalla = anyLineHasService(detalles, "lleva_cambio_talla");
  const showImporte = showAccounting && lineAmounts !== null;
  // Líneas con los SKU recién vinculados superpuestos, y lo que cada muestra
  // tiene listo para vincular. `partida` es el número de la columna "#" (la
  // posición en `detalles`), para que el aviso nombre las mismas partidas que
  // se ven en la tabla.
  const lineas = detalles.map((linea) => withLinkedSampleSkus(linea, sampleSkus.linkedSkus));
  const linkableLines = lineas.flatMap((linea, index) => {
    if (!isSampleLine(linea)) return [];
    const { linkableIds } = sampleSkuLineSummary(linea);
    return linkableIds.length > 0
      ? [{ lineaId: linea.id, tallaIds: linkableIds, partida: index + 1 }]
      : [];
  });
  // Lo que la última vinculación dejó sin resolver, SOLO sobre tallas que
  // siguen listas para vincular: así el aviso desaparece solo cuando esas
  // tallas se vinculan, y una corrida nueva lo reemplaza (reinicia `bulkRuns`).
  const stopReason =
    linkableLines.map((line) => sampleSkus.bulkRuns[line.lineaId]?.stopReason).find(Boolean) ??
    null;
  const rejected = linkableLines.reduce((sum, line) => {
    const failures = sampleSkus.bulkRuns[line.lineaId]?.failures ?? {};
    return sum + line.tallaIds.filter((tallaId) => tallaId in failures).length;
  }, 0);
  const outcome = stopReason !== null || rejected > 0 ? { stopReason, rejected } : null;
  const linkableCount = linkableLines.reduce((sum, line) => sum + line.tallaIds.length, 0);
  const isRunning = sampleSkus.runningLineaIds.length > 0;
  const columnCount = 9 + (showCambioTalla ? 1 : 0) + (showAccounting ? 1 : 0) + (showImporte ? 1 : 0);

  return (
    <SheetSection title="Detalle de Productos">
      {(linkableCount > 0 || isRunning) && (
        <SampleSkuLinkBanner
          linkableCount={linkableCount}
          partidas={linkableLines.map((line) => line.partida)}
          block={sampleSkus.block}
          isRunning={isRunning}
          runProgress={sampleSkus.runProgress}
          outcome={outcome}
          hasPendingSingle={sampleSkus.hasPendingSingle}
          onLinkAll={() =>
            sampleSkus.onLinkAll(
              linkableLines.map(({ lineaId, tallaIds }) => ({ lineaId, tallaIds })),
            )
          }
        />
      )}
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
              lineas.map((linea, index) => (
                <tr key={linea.id} className="align-top">
                  <td className="p-2 text-center text-xs text-slate-400 select-none">{index + 1}</td>
                  <td className="p-2">
                    {isSampleLine(linea) ? (
                      <SampleSkuIndicator
                        linea={linea}
                        kindLabel={muestraBadge.label}
                        isLinking={sampleSkus.runningLineaIds.includes(linea.id)}
                        onOpen={sampleSkus.onOpen}
                      />
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
