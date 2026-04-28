"use client";

import { useState } from "react";
import { EyeIcon } from "@/src/components/Icons";
import { QuoteById } from "../interfaces/quote.interface";
import { toCurrencyOrDash } from "../utils/quoteDetailsFormatters";
import { QuoteProductEmbroideryView } from "./QuoteProductEmbroideryView";
import { QuoteProductReflectiveView } from "./QuoteProductReflectiveView";

type ActiveDetailView = "embroidery" | "reflective";
interface ActiveView {
  detailId: number;
  view: ActiveDetailView;
}

interface QuoteDetailsProductsProps {
  details: QuoteById["detalles"];
}

export const QuoteDetailsProducts = ({ details }: QuoteDetailsProductsProps) => {
  const [activeView, setActiveView] = useState<ActiveView | null>(null);

  if (!details.length) { // If no details
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-4 text-sm text-slate-500 dark:text-slate-400">
        Sin productos asociados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {details.map((detalle) => {
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

        return (
          <div
            key={detalle.id}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {detalle.producto_nombre}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Subtotal línea:{" "}
                  {toCurrencyOrDash(
                    detalle.tallas.reduce(
                      (acc, talla) => acc + Number(talla.precio_unitario) * Number(talla.cantidad),
                      0
                    )
                  )}
                </div>
              </div>
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
                        <th className="px-3 py-2 text-left font-semibold">Talla</th>
                        <th className="px-3 py-2 text-left font-semibold">Cantidad</th>
                        <th className="px-3 py-2 text-left font-semibold">Precio Unitario</th>
                        <th className="px-3 py-2 text-left font-semibold">Subtotal</th>
                        <th className="px-3 py-2 text-left font-semibold">Bordado</th>
                        <th className="px-3 py-2 text-left font-semibold">Reflejante</th>
                        <th className="px-3 py-2 text-left font-semibold">Corte Manga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.tallas.map((talla) => (
                        <tr key={talla.id} className="border-t border-slate-100 dark:border-white/10">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{talla.talla_nombre}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{talla.cantidad}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                            {toCurrencyOrDash(talla.precio_unitario)}
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                            {toCurrencyOrDash(Number(talla.precio_unitario) * Number(talla.cantidad))}
                          </td>
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
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
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
                                  ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
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
        );
      })}
    </div>
  );
};
