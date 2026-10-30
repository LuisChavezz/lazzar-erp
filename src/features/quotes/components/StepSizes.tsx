/**
 * StepSizes.tsx
 * Presenta el UI para asignar cantidades por talla a cada producto seleccionado.
 * Consume el mapa `sizeQuantitiesPerProduct` y expone inputs numéricos por talla.
 */
import { memo } from "react";
import { ChevronDownIcon } from "@/src/components/Icons";
import {
  getSizeQuantityError,
  parseSizeQuantity,
  type SizeQuantitiesMap,
} from "../hooks/useSizesState";
import type { CatalogRow } from "../types";
import type { Size } from "../../sizes/interfaces/size.interface";
import { formatQuoteAmount } from "../utils/formatQuoteAmount";
import {
  MUESTRA_SIZES_ERROR_MESSAGE,
  MUESTRA_SIZES_LOADING_MESSAGE,
  type IncompatibleSize,
  type MuestraSizesStatus,
} from "../utils/muestraCategorySizes";

interface StepSizesProps {
  selectedRows: CatalogRow[];
  sizesPerProduct: Record<number, Size[]>;
  sizeQuantitiesPerProduct: SizeQuantitiesMap;
  updateSizeQuantity: (productId: number, sizeId: number, value: string) => void;
  openProductId: number | null;
  /**
   * Acordeón MULTI-abierto, opcional. Cuando se pasa, manda sobre
   * `openProductId` y varias filas pueden estar abiertas a la vez.
   *
   * Existe porque la validación exige tallas en TODAS las filas: con una sola
   * abierta, capturar N muestras dejaba paneles nunca vistos que al Agregar
   * salían con "Sin tallas". Es OPCIONAL a propósito — quien no la pasa
   * (catálogo y el diálogo de editar tallas) conserva el acordeón de una sola
   * fila abierta, exactamente como antes.
   */
  openProductIds?: ReadonlySet<number>;
  onToggleProduct: (id: number) => void;
  sizeErrors: Record<number, string>;
  /**
   * Código ISO de la moneda elegida en la cotización: los precios de los pasos
   * se muestran en ella (EC-606). `null` sin moneda elegida: sin símbolo.
   */
  monedaCodigo: string | null;
  /**
   * Filas de MUESTRA cuya lista de tallas por categoría aún no está lista
   * (EC-647): en vez de las tallas se muestra el aviso. Opcional; catálogo no
   * la pasa.
   */
  sizesStatusPerProduct?: Record<number, MuestraSizesStatus>;
  /**
   * Tallas capturadas que no son de la categoría de la muestra (datos guardados
   * antes de EC-647). Se listan marcadas, con su cantidad, para quitarlas a
   * mano: nunca se descartan en silencio. Opcional; catálogo no la pasa.
   */
  incompatibleSizesPerProduct?: Record<number, IncompatibleSize[]>;
  onRemoveIncompatibleSize?: (productId: number, sizeId: number) => void;
}

const SIZES_STATUS_MESSAGES: Record<MuestraSizesStatus, string> = {
  loading: MUESTRA_SIZES_LOADING_MESSAGE,
  error: MUESTRA_SIZES_ERROR_MESSAGE,
};

export const StepSizes = memo(function StepSizes({
  selectedRows,
  sizesPerProduct,
  sizeQuantitiesPerProduct,
  updateSizeQuantity,
  openProductId,
  openProductIds,
  onToggleProduct,
  sizeErrors,
  monedaCodigo,
  sizesStatusPerProduct,
  incompatibleSizesPerProduct,
  onRemoveIncompatibleSize,
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
            const sizesForProduct = sizesPerProduct[row.id] ?? [];
            const totalQty = sizesForProduct.reduce(
              (s, size) => s + parseSizeQuantity(quantities[size.id]),
              0
            );
            const isOpen = openProductIds
              ? openProductIds.has(row.id)
              : openProductId === row.id;
            const hasError = Boolean(sizeErrors[row.id]);
            const sizesStatus = sizesStatusPerProduct?.[row.id];
            const incompatibleSizes = incompatibleSizesPerProduct?.[row.id] ?? [];

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
                      {formatQuoteAmount(row.precio, monedaCodigo)} / pza
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
                    <ChevronDownIcon
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
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
                        {incompatibleSizes.length > 0 && (
                          <div className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50/60 dark:bg-rose-900/10 px-3 py-2 space-y-2">
                            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                              Estas tallas no son de la categoría de la muestra. Quítalas para continuar.
                            </p>
                            <ul className="space-y-1">
                              {incompatibleSizes.map((size) => (
                                <li
                                  key={size.id}
                                  className="flex items-center justify-between gap-3 text-sm text-rose-700 dark:text-rose-300"
                                >
                                  <span>
                                    <span className="font-semibold">{size.nombre}</span>
                                    {" · "}
                                    {size.cantidad} pzas
                                  </span>
                                  {onRemoveIncompatibleSize && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveIncompatibleSize(row.id, size.id)}
                                      aria-label={`Quitar talla ${size.nombre} de ${row.nombre}`}
                                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                                    >
                                      Quitar
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {sizesStatus ? (
                          <p
                            role={sizesStatus === "error" ? "alert" : "status"}
                            className={`text-sm ${
                              sizesStatus === "error"
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {SIZES_STATUS_MESSAGES[sizesStatus]}
                          </p>
                        ) : sizesForProduct.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No hay tallas disponibles.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sizesForProduct.map((size) => {
                              const quantityError = getSizeQuantityError(quantities[size.id]);
                              const errorId = `size-qty-error-${row.id}-${size.id}`;
                              return (
                                <div
                                  key={size.id}
                                  className={`rounded-xl border bg-white/70 dark:bg-zinc-900/40 px-3 py-2 ${
                                    quantityError
                                      ? "border-rose-300 dark:border-rose-700"
                                      : "border-slate-200 dark:border-white/10"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                      {size.nombre}
                                    </span>
                                    {/* Texto y no `type="number"`: así se conserva lo que se
                                        tecleó (`1.5`) para rechazarlo con su mensaje, en vez
                                        de que el navegador lo vacíe o se trunque a `1`. */}
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="0"
                                      value={quantities[size.id] ?? ""}
                                      onChange={(event) =>
                                        updateSizeQuantity(row.id, size.id, event.target.value)
                                      }
                                      aria-label={`Cantidad talla ${size.nombre} para ${row.nombre}`}
                                      aria-invalid={Boolean(quantityError)}
                                      aria-describedby={quantityError ? errorId : undefined}
                                      className={`w-20 rounded-lg border bg-white dark:bg-zinc-900 px-2 py-1 text-right text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                                        quantityError
                                          ? "border-rose-400 dark:border-rose-500"
                                          : "border-slate-200 dark:border-slate-700"
                                      }`}
                                    />
                                  </div>
                                  {quantityError && (
                                    <p
                                      id={errorId}
                                      className="mt-1 text-[10px] text-right text-rose-600 dark:text-rose-400"
                                    >
                                      {quantityError}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
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
