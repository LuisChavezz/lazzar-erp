"use client";

import { useState } from "react";
import { EyeIcon } from "@/src/components/Icons";
import { OrderById } from "../interfaces/order.interface";
import { toCurrencyOrDash } from "../utils/orderDetailsFormatters";
import { OrderProductEmbroideryView } from "./OrderProductEmbroideryView";

interface OrderDetailsProductsProps {
  details: OrderById["detalles"];
}

export const OrderDetailsProducts = ({ details }: OrderDetailsProductsProps) => {
  const [activeEmbroideryDetailId, setActiveEmbroideryDetailId] = useState<number | null>(null); // Active embroidery detail ID

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
        const isEmbroideryViewActive = activeEmbroideryDetailId === detalle.id;
        const embroideryGroupCount = new Set(
          detalle.tallas
            .filter((talla) => talla.lleva_bordado && talla.bordado_config)
            .map((talla) => JSON.stringify(talla.bordado_config))
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
              <button
                type="button"
                onClick={() => setActiveEmbroideryDetailId(detalle.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isEmbroideryViewActive
                    ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/20 dark:text-sky-300"
                    : "cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                <EyeIcon className="h-3.5 w-3.5" />
                Ver bordados ({embroideryGroupCount})
              </button>
            </div>

            <div className="relative">
              <div
                className={`transition-all duration-500 ease-out ${
                  isEmbroideryViewActive
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                className={`transition-all duration-500 ease-out ${
                  isEmbroideryViewActive
                    ? "relative translate-x-0 opacity-100"
                    : "absolute inset-0 translate-x-6 opacity-0 pointer-events-none"
                }`}
              >
                <OrderProductEmbroideryView
                  detail={detalle}
                  onBack={() => setActiveEmbroideryDetailId((current) => (current === detalle.id ? null : current))}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
