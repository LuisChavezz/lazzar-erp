/**
 * StepSizes.tsx
 * Presenta el UI para asignar cantidades por talla a cada producto seleccionado.
 * Consume el mapa `sizeQuantitiesPerProduct` y expone inputs numéricos por talla.
 */
import { memo } from "react";
import type { CatalogRow } from "../types";
import type { Size } from "../../sizes/interfaces/size.interface";

interface StepSizesProps {
  selectedRows: CatalogRow[];
  sizes: Size[];
  sizeQuantitiesPerProduct: Record<number, Record<number, number>>;
  updateSizeQuantity: (productId: number, sizeId: number, value: number) => void;
  openProductId: number | null;
  onToggleProduct: (id: number) => void;
  sizeErrors: Record<number, string>;
}

export const StepSizes = memo(function StepSizes({
  selectedRows,
  sizes,
  sizeQuantitiesPerProduct,
  updateSizeQuantity,
  openProductId,
  onToggleProduct,
  sizeErrors,
}: StepSizesProps) {
  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tallas por producto
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Abre cada producto y asigna cantidades por talla.
          </p>
        </div>
      </div>

      {selectedRows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay productos seleccionados.
        </p>
      ) : (
        <div className="space-y-2">
          {selectedRows.map((row) => {
            const quantities = sizeQuantitiesPerProduct[row.id] ?? {};
            const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
            const isOpen = openProductId === row.id;
            const hasError = Boolean(sizeErrors[row.id]);

            return (
              <div
                key={row.id}
                className={`rounded-2xl border overflow-hidden transition-colors ${
                  hasError
                    ? "border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-900/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleProduct(row.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Contraer" : "Expandir"} tallas de ${row.nombre}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {row.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ${row.precio.toFixed(2)} / pza
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {hasError ? (
                      <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                        {sizeErrors[row.id]}
                      </span>
                    ) : totalQty > 0 ? (
                      <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded-full">
                        {totalQty} pzas
                      </span>
                    ) : null}
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-slate-200 dark:border-white/10">
                      <div className="pt-3 space-y-3">
                        {sizes.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No hay tallas disponibles.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sizes.map((size) => (
                              <div
                                key={size.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/40 px-3 py-2"
                              >
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {size.nombre}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={quantities[size.id] ?? ""}
                                  onChange={(event) =>
                                    updateSizeQuantity(row.id, size.id, Number(event.target.value))
                                  }
                                  aria-label={`Cantidad talla ${size.nombre} para ${row.nombre}`}
                                  className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 px-2 py-1 text-right text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div
                          className="text-right text-xs text-slate-500 dark:text-slate-400"
                          aria-live="polite"
                        >
                          Total: <span className="font-semibold">{totalQty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
