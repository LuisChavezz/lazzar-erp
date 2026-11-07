"use client";

import { Button } from "@/src/components/Button";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { TallaServiceChips } from "@/src/features/orders/components/TallaServiceChips";
import { skuStatusPillClass } from "@/src/features/orders/constants/skuStatusPills";
import { cleanText } from "@/src/utils/cleanText";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { altaCatalogoMutationKey } from "../hooks/useAltaCatalogoLinea";
import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "../interfaces/special-order.interface";
import {
  CATALOG_ALTA_BUTTON_NO_CATEGORY,
  getCatalogAltaButtonState,
  isTallaPendingCatalogAlta,
} from "../utils/catalogAlta";
import { getLineSkuStatus } from "../utils/lineSkuStatus";
import { TallaAvance } from "./TallaAvance";

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
  pedidoId: number;
  detalles: SpecialOrderLine[];
  /**
   * Se ofrecen las acciones de la línea (alta de SKU y alta en catálogo): el
   * usuario las ve y el pedido no está cancelado (`canActOnSpecialOrderLines`).
   * Es solo visibilidad: quién puede ejecutarlas lo decide el backend.
   */
  canGenerateSkus: boolean;
  /** Abre el alta de SKU + BOM de la línea. El diálogo lo tiene la página. */
  onGenerateSkus: (line: SpecialOrderLine) => void;
  /** Abre la confirmación del alta en catálogo de la línea. La tiene la página. */
  onAltaCatalogo: (line: SpecialOrderLine) => void;
}

/**
 * "Dar de alta en catálogo" de la línea: solo si se ofrecen las acciones de la
 * línea y alguna talla tiene SKU de producción pendiente de catálogo. Sin
 * categoría también se ofrece: el diálogo la pide (`choose-category`) y el
 * aviso lo anticipa al lector de pantalla y en el `title`.
 */
function CatalogAltaButton({
  pedidoId,
  line,
  canGenerateSkus,
  onAltaCatalogo,
}: {
  pedidoId: number;
  line: SpecialOrderLine;
  canGenerateSkus: boolean;
  onAltaCatalogo: (line: SpecialOrderLine) => void;
}) {
  const { isRunning } = useMutationLock(altaCatalogoMutationKey(pedidoId, line.id));
  const state = getCatalogAltaButtonState(line, canGenerateSkus);
  if (state === "hidden") return null;

  const hintId = `catalog-alta-hint-${line.id}`;
  const choosesCategory = state === "choose-category";
  return (
    <>
      <Button
        variant="secondary"
        rounded="full"
        disabled={isRunning}
        title={choosesCategory ? CATALOG_ALTA_BUTTON_NO_CATEGORY : undefined}
        aria-describedby={choosesCategory ? hintId : undefined}
        onClick={() => onAltaCatalogo(line)}
      >
        {isRunning ? "Dando de alta..." : "Dar de alta en catálogo"}
      </Button>
      {choosesCategory && (
        <span id={hintId} className="sr-only">
          {CATALOG_ALTA_BUTTON_NO_CATEGORY}
        </span>
      )}
    </>
  );
}

/**
 * Celda "SKU catálogo" de una talla: el SKU si ya está en catálogo,
 * "No aplica" si tiene SKU de producción sin alta (no toda muestra va a
 * catálogo; si después se decide, la línea conserva "Dar de alta en
 * catálogo"), "—" si no tiene SKU.
 */
function TallaCatalogSku({ talla }: { talla: SpecialOrderTalla }) {
  if (talla.sku_catalogo) {
    return <span className="font-mono">{talla.sku_catalogo}</span>;
  }
  if (isTallaPendingCatalogAlta(talla)) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
        No aplica
      </span>
    );
  }
  return <span className="text-slate-400 dark:text-slate-500">—</span>;
}

/**
 * Estado del alta de SKU de la línea, en tres casos:
 *  - Ninguna talla tiene SKU: la acción de alta (si el usuario la ve y hay
 *    tallas con cantidad; sin ellas el backend la rechazaría).
 *  - Todas las tallas con cantidad tienen SKU: "SKU generados".
 *  - Hay SKU pero alguna talla con cantidad no lo tiene: "SKU incompletos" y,
 *    junto, la acción de alta. Pasa si la talla se agregó (o ganó cantidad)
 *    DESPUÉS del alta; el alta es incremental y solo genera esas tallas.
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
  const status = getLineSkuStatus(line);

  if (status.kind === "generated") {
    return (
      <span className={skuStatusPillClass("emerald")}>
        SKU generados
      </span>
    );
  }
  if (status.kind === "none") return null;

  const generateButton = canGenerateSkus ? (
    <Button variant="primary" rounded="full" onClick={() => onGenerateSkus(line)}>
      Generar SKU y BOM
    </Button>
  ) : null;

  if (!status.partial) return generateButton;

  const nombres = status.pendientes.map((talla) => talla.talla_nombre || "—").join(", ");
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-col items-end gap-0.5">
        <span className={skuStatusPillClass("amber")}>
          SKU incompletos
        </span>
        <p className="text-[11px] text-amber-700 dark:text-amber-400 text-right">
          Sin SKU ni lista de materiales: {nombres}
        </p>
      </div>
      {generateButton}
    </div>
  );
}

/** Pastilla de estado del SKU de la línea, para el encabezado plegado. */
function LineSkuPill({ line }: { line: SpecialOrderLine }) {
  const status = getLineSkuStatus(line);
  if (status.kind === "generated") {
    return <span className={skuStatusPillClass("emerald")}>SKU completos</span>;
  }
  if (status.kind === "pending") {
    return (
      <span className={skuStatusPillClass(status.partial ? "amber" : "slate")}>
        {status.partial ? "SKU incompletos" : "Sin SKU"}
      </span>
    );
  }
  return null;
}

/**
 * Líneas de muestra del pedido: una tarjeta por línea (producto externo +
 * color · total de piezas) con su tabla de tallas. Patrón de `PedidoLineas`,
 * sin precios ni picking — este contrato no los trae. Cada talla muestra su SKU
 * de producción y el de catálogo; cada tarjeta, el estado del alta de SKU de la
 * línea y, si hay tallas pendientes, el alta en catálogo.
 */
export function SpecialOrderLines({
  pedidoId,
  detalles,
  canGenerateSkus,
  onGenerateSkus,
  onAltaCatalogo,
}: SpecialOrderLinesProps) {
  if (detalles.length === 0) {
    return <EmptyLines>Este pedido no tiene líneas de muestra.</EmptyLines>;
  }

  return (
    <div className="space-y-4">
      {detalles.map((line) => (
        <details
          key={line.id}
          open={getLineSkuStatus(line).kind !== "generated"}
          className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
        >
          {/* Encabezado plegable: nombre (recortado a dos renglones; completo
              al abrir), color, categoría, estado del SKU, tallas y piezas. Las
              acciones viven dentro, para que un clic en ellas no pliegue la
              tarjeta. */}
          <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
              fill="currentColor"
            >
              <path d="M7.2 4.7a.75.75 0 0 1 1.06 0l4.77 4.77a.75.75 0 0 1 0 1.06l-4.77 4.77a.75.75 0 1 1-1.06-1.06L11.44 10 7.2 5.76a.75.75 0 0 1 0-1.06Z" />
            </svg>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p
                className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words line-clamp-2 group-open:line-clamp-none"
                title={line.producto_nombre_externo || undefined}
              >
                {line.producto_nombre_externo || "—"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {line.color_nombre && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 px-2.5 py-0.5 font-medium text-slate-700 dark:text-slate-300">
                    {line.color_nombre}
                  </span>
                )}
                <span
                  className={
                    line.categoria_producto
                      ? "text-slate-600 dark:text-slate-300"
                      : "text-slate-400 dark:text-slate-500"
                  }
                >
                  {line.categoria_producto?.nombre ?? "Sin categoría"}
                </span>
                <LineSkuPill line={line} />
              </div>
              <div className="flex flex-wrap gap-1">
                {line.tallas.map((talla) => (
                  <span
                    key={talla.id}
                    title={talla.sku_produccion ? `SKU ${talla.sku_produccion}` : "Sin SKU"}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                      talla.sku_produccion
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                    }`}
                  >
                    <span className="font-medium">{talla.talla_nombre || "—"}</span>
                    <span className="tabular-nums font-semibold">
                      {formatQuantityValue(talla.cantidad)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {formatQuantityValue(totalPiezas(line.tallas))}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">piezas</p>
            </div>
          </summary>

          {/* Acciones de la línea (alta de SKU, alta en catálogo). */}
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-slate-100 dark:border-white/10 px-4 py-2 empty:hidden">
            {/* "SKU generados" ya se lee en el encabezado: aquí solo la acción. */}
            {getLineSkuStatus(line).kind !== "generated" && (
              <LineSkuStatus
                line={line}
                canGenerateSkus={canGenerateSkus}
                onGenerateSkus={onGenerateSkus}
              />
            )}
            <CatalogAltaButton
              pedidoId={pedidoId}
              line={line}
              canGenerateSkus={canGenerateSkus}
              onAltaCatalogo={onAltaCatalogo}
            />
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
                      <th className="px-3 py-2 text-left font-semibold">SKU catálogo</th>
                      <th className="px-3 py-2 text-left font-semibold">Servicios</th>
                      <th className="px-3 py-2 text-left font-semibold">Avance</th>
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
                        <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">
                          <TallaCatalogSku talla={talla} />
                        </td>
                        <td className="px-3 py-2">
                          <TallaServices talla={talla} line={line} />
                        </td>
                        <td className="px-3 py-2">
                          <TallaAvance talla={talla} />
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
        </details>
      ))}
    </div>
  );
}
