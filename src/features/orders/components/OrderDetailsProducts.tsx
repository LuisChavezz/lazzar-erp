"use client";

import { OrderById } from "../interfaces/order.interface";
import { toCurrencyOrDash } from "../utils/orderDetailsFormatters";

interface OrderDetailsProductsProps {
  details: OrderById["detalles"];
}

export const OrderDetailsProducts = ({ details }: OrderDetailsProductsProps) => {
  if (!details.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-4 text-sm text-slate-500 dark:text-slate-400">
        Sin productos asociados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {details.map((detalle) => (
        <div
          key={detalle.id}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Producto #{detalle.producto}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Subtotal línea: {toCurrencyOrDash(detalle.subtotal_linea)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold">Talla ID</th>
                  <th className="px-3 py-2 text-left font-semibold">Cantidad</th>
                  <th className="px-3 py-2 text-left font-semibold">Precio Unitario</th>
                  <th className="px-3 py-2 text-left font-semibold">Subtotal</th>
                  <th className="px-3 py-2 text-left font-semibold">Bordado</th>
                </tr>
              </thead>
              <tbody>
                {detalle.tallas.map((talla) => (
                  <tr key={talla.id} className="border-t border-slate-100 dark:border-white/10">
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{talla.talla}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{talla.cantidad}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{toCurrencyOrDash(talla.precio_unitario)}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{toCurrencyOrDash(talla.subtotal_talla)}</td>
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
      ))}
    </div>
  );
};
