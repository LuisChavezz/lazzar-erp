"use client";

import { useState } from "react";
import { ChevronDownIcon, EyeIcon } from "@/src/components/Icons";
import type { QuoteDetailView } from "../interfaces/quote.interface";
import {
  hasQuoteLinePrices,
  quoteLineSubtotal,
  quoteTallaSubtotal,
} from "../utils/quoteAmountVisibility";
import { getQuoteDetailProductName } from "../utils/quoteDetailsFormatters";
import {
  getTipoPedidoConfig,
  TIPO_PEDIDO,
} from "../../orders/constants/pedidoStatus";
import { QuoteProductEmbroideryView } from "./QuoteProductEmbroideryView";
import { QuoteProductReflectiveView } from "./QuoteProductReflectiveView";

type ActiveDetailView = "embroidery" | "reflective";
interface ActiveView {
  detailId: number;
  view: ActiveDetailView;
}

interface QuoteDetailsProductsProps {
  details: QuoteDetailView["detalles"];
  /** Formato de importes en la moneda de la cotización (lo resuelve `QuoteDetails`). */
  formatAmount: (value?: string | number | null) => string;
}

const plural = (n: number, singular: string, pluralForm: string) =>
  `${n.toLocaleString("es-MX")} ${n === 1 ? singular : pluralForm}`;

export const QuoteDetailsProducts = ({ details, formatAmount }: QuoteDetailsProductsProps) => {
  const [activeView, setActiveView] = useState<ActiveView | null>(null);
  // Sin precios (enmascarados por el backend) no hay subtotal que mostrar: se
  // omiten el subtotal de cada línea y las columnas de precio y subtotal.
  const showPrices = hasQuoteLinePrices(details);
  // Cada producto es un desplegable: con muchas prendas, la lista se lee como
  // un índice (nombre, piezas, subtotal) y las tallas se abren a demanda. Si
  // solo hay uno, arranca abierto: no hay nada que resumir.
  const [openIds, setOpenIds] = useState<Set<number>>(
    () => new Set(details.length === 1 ? [details[0].id] : []),
  );
  const allOpen = details.length > 0 && details.every((detalle) => openIds.has(detalle.id));
  const toggleOpen = (id: number) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const totalPiezas = details.reduce(
    (acc, detalle) =>
      acc + detalle.tallas.reduce((sum, talla) => sum + (Number(talla.cantidad) || 0), 0),
    0,
  );
  // Misma fuente que el badge de la tabla de captura y el de la columna "Tipo"
  // del listado, para que las tres vistas nombren y coloreen igual.
  const muestraBadge = getTipoPedidoConfig(TIPO_PEDIDO.MUESTRA);

  if (!details.length) { // If no details
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-4 text-sm text-slate-500 dark:text-slate-400">
        Sin productos asociados.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {details.length > 1 && (
        <div className="flex items-center justify-between gap-3 px-1 pb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {plural(details.length, "producto", "productos")} · {plural(totalPiezas, "pieza", "piezas")}
          </span>
          <button
            type="button"
            onClick={() =>
              setOpenIds(allOpen ? new Set() : new Set(details.map((detalle) => detalle.id)))
            }
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {allOpen ? "Cerrar todos" : "Abrir todos"}
          </button>
        </div>
      )}
      {details.map((detalle) => {
        const isOpen = openIds.has(detalle.id);
        const isEmbroideryViewActive = activeView?.detailId === detalle.id && activeView.view === "embroidery";
        const isReflectiveViewActive = activeView?.detailId === detalle.id && activeView.view === "reflective";
        const isAnyViewActive = isEmbroideryViewActive || isReflectiveViewActive;
        const embroideryGroupCount = new Set(
          detalle.tallas
            .filter((talla) => talla.lleva_bordado && talla.bordado_config)
            .map((talla) => JSON.stringify(talla.bordado_config))
        ).size;
        // Cuenta configuraciones únicas de reflejante (igual que embroideryGroupCount).
        const reflectiveGroupCount = new Set(
          detalle.tallas
            .filter((talla) => talla.lleva_reflejante && talla.reflejante_config?.length > 0)
            .map((talla) => JSON.stringify(talla.reflejante_config))
        ).size;
        const piezasLinea = detalle.tallas.reduce(
          (acc, talla) => acc + (Number(talla.cantidad) || 0),
          0,
        );
        // `null` (alguna talla sin precio) se pinta como "-", nunca como 0.
        const subtotalLinea = quoteLineSubtotal(detalle);

        return (
          <div
            key={detalle.id}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
          >
            {/* Encabezado = desplegable: lo esencial en una línea (nombre,
                qué lleva, piezas y subtotal); las tallas, al abrir. */}
            <button
              type="button"
              onClick={() => toggleOpen(detalle.id)}
              aria-expanded={isOpen}
              className="group w-full flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
            >
                <span className="min-w-0 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {getQuoteDetailProductName(detalle)}
                  </span>
                  {/* Marcador de DOMINIO: en datos de lectura no existe el
                      discriminante `tipo` del formulario. Una partida sin
                      `producto` es una muestra — la misma señal que ya usa
                      `getQuoteDetailProductName` para caer al nombre externo. */}
                  {detalle.producto == null && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${muestraBadge.className}`}
                    >
                      {muestraBadge.label}
                    </span>
                  )}
                  {/* Categoría de la muestra. Se pinta AQUÍ y no dentro de
                      `getQuoteDetailProductName`, que también alimenta el PDF,
                      el correo y la tabla de captura. Las muestras anteriores
                      al campo no la traen y simplemente no muestran nada. */}
                  {detalle.producto == null && detalle.categoria_producto_nombre && (
                    <span
                      title="Categoría de producto"
                      className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                      {detalle.categoria_producto_nombre}
                    </span>
                  )}
                  {detalle.color_nombre && detalle.color_codigo_hex && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                        style={{ backgroundColor: detalle.color_codigo_hex }}
                        aria-hidden="true"
                      />
                      {detalle.color_nombre}
                    </span>
                  )}
                </span>
                <span className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {embroideryGroupCount > 0 && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                      Bordado
                    </span>
                  )}
                  {reflectiveGroupCount > 0 && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      Reflejante
                    </span>
                  )}
                  <span>
                    {plural(detalle.tallas.length, "talla", "tallas")} ·{" "}
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {plural(piezasLinea, "pieza", "piezas")}
                    </span>
                  </span>
                  {showPrices && (
                    <span
                      className="font-semibold text-slate-800 dark:text-white"
                      title="Subtotal de la línea"
                    >
                      {formatAmount(subtotalLinea)}
                    </span>
                  )}
                  <ChevronDownIcon
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </span>
            </button>

            {isOpen && (
            <div className="border-t border-slate-200 dark:border-white/10">
            {(embroideryGroupCount > 0 || reflectiveGroupCount > 0) && (
            <div className="px-4 py-2 border-b border-slate-100 dark:border-white/10 flex justify-end">
              <div className="flex flex-wrap gap-2">
                {embroideryGroupCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveView(isEmbroideryViewActive ? null : { detailId: detalle.id, view: "embroidery" })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isEmbroideryViewActive
                        ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/20 dark:text-sky-300"
                        : "cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    Ver bordados ({embroideryGroupCount})
                  </button>
                )}
                {reflectiveGroupCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveView(isReflectiveViewActive ? null : { detailId: detalle.id, view: "reflective" })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isReflectiveViewActive
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-300"
                        : "cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    Ver reflejantes ({reflectiveGroupCount})
                  </button>
                )}
              </div>
            </div>
            )}

            <div className="relative">
              {/* Vista normal: tabla de tallas */}
              <div
                className={`transition-all duration-500 ease-out ${
                  isAnyViewActive
                    ? "absolute inset-0 -translate-x-6 opacity-0 pointer-events-none"
                    : "relative translate-x-0 opacity-100"
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-white/5">
                      <tr className="text-slate-500 dark:text-slate-400">
                        <th className="px-3 py-2 text-left font-semibold">SKU</th>
                        <th className="px-3 py-2 text-left font-semibold">Talla</th>
                        <th className="px-3 py-2 text-left font-semibold">Cantidad</th>
                        {showPrices && (
                          <>
                            <th className="px-3 py-2 text-left font-semibold">Precio Unitario</th>
                            <th className="px-3 py-2 text-left font-semibold">Subtotal</th>
                          </>
                        )}
                        <th className="px-3 py-2 text-left font-semibold">Bordado</th>
                        <th className="px-3 py-2 text-left font-semibold">Reflejante</th>
                        <th className="px-3 py-2 text-left font-semibold">Corte Manga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.tallas.map((talla) => (
                        <tr key={talla.id} className="border-t border-slate-100 dark:border-white/10">
                          <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {/* En una línea de MUESTRA el `sku` del backend no
                                es un SKU: llega armado con lo que haya (código
                                de color + talla, o solo la talla: "80240",
                                "CH") y nunca vacío, así que se IGNORA. Lo único
                                real es el SKU de producción vinculado desde el
                                pedido, si ya lo tiene. */}
                            {detalle.producto == null
                              ? talla.sku_muestra || "-"
                              : talla.sku || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{talla.talla_nombre}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{talla.cantidad}</td>
                          {showPrices && (
                            <>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                                {formatAmount(talla.precio_unitario)}
                              </td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                                {formatAmount(quoteTallaSubtotal(talla))}
                              </td>
                            </>
                          )}
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                                talla.lleva_bordado
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                              }`}
                            >
                              {talla.lleva_bordado ? "Sí" : "No"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                                talla.lleva_reflejante
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                              }`}
                            >
                              {talla.lleva_reflejante ? "Sí" : "No"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                                talla.lleva_corte_manga
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                              }`}
                            >
                              {talla.lleva_corte_manga ? "Sí" : "No"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista de bordados */}
              <div
                className={`transition-all duration-500 ease-out ${
                  isEmbroideryViewActive
                    ? "relative translate-x-0 opacity-100"
                    : "absolute inset-0 translate-x-6 opacity-0 pointer-events-none"
                }`}
              >
                <QuoteProductEmbroideryView
                  detail={detalle}
                  onBack={() => setActiveView((current) => (current?.detailId === detalle.id ? null : current))}
                />
              </div>

              {/* Vista de reflejantes */}
              <div
                className={`transition-all duration-500 ease-out ${
                  isReflectiveViewActive
                    ? "relative translate-x-0 opacity-100"
                    : "absolute inset-0 translate-x-6 opacity-0 pointer-events-none"
                }`}
              >
                <QuoteProductReflectiveView
                  detail={detalle}
                  onBack={() => setActiveView((current) => (current?.detailId === detalle.id ? null : current))}
                />
              </div>
            </div>
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
