/**
 * StepColors.tsx
 * Presenta el UI para seleccionar un color por producto en el flujo de alta de productos.
 * Muestra secciones expandibles por producto con chips de color (nombre + muestra visual).
 */
import { memo } from "react";
import { ChevronDownIcon } from "@/src/components/Icons";
import type { Color } from "../../colors/interfaces/color.interface";
import type { CatalogRow } from "../types";
import { ColorOption } from "./ColorOption";

// ── ColorOption ───────────────────────────────────────────────────────────────

export type { ColorOptionProps } from "./ColorOption";
export { ColorOption } from "./ColorOption";

// ── StepColors ────────────────────────────────────────────────────────────────

export interface StepColorsProps {
  selectedRows: CatalogRow[];
  productColorsById: Record<number, Color[]>;
  selectedColorPerProduct: Record<number, number | null>;
  onSelectColor: (productId: number, colorId: number) => void;
  openProductId: number | null;
  onToggleProduct: (id: number) => void;
  colorErrors: Record<number, string>;
}

/**
 * `StepColors`
 * Vista presentacional del paso de selección de color. Muestra cada producto
 * seleccionado en una sección expandible con chips de `ColorOption`.
 */
export const StepColors = memo(function StepColors({
  selectedRows,
  productColorsById,
  selectedColorPerProduct,
  onSelectColor,
  openProductId,
  onToggleProduct,
  colorErrors,
}: StepColorsProps) {
  return (
    <div className="space-y-3 mt-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Color por producto
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Abre cada producto y selecciona el color deseado.
        </p>
      </div>

      {selectedRows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay productos seleccionados.
        </p>
      ) : (
        <div className="space-y-2">
          {selectedRows.map((row) => {
            const colors = productColorsById[row.id] ?? [];
            const selectedColorId = selectedColorPerProduct[row.id];
            const selectedColor = colors.find((c) => c.id === selectedColorId);
            const isOpen = openProductId === row.id;
            const hasError = Boolean(colorErrors[row.id]);
            const noColors = colors.length === 0;

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
                  onClick={() => !noColors && onToggleProduct(row.id)}
                  disabled={noColors}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    noColors
                      ? "cursor-default"
                      : "cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5"
                  }`}
                  aria-expanded={!noColors && isOpen}
                  aria-label={
                    noColors
                      ? `${row.nombre} — sin colores disponibles`
                      : `${isOpen ? "Contraer" : "Expandir"} colores de ${row.nombre}`
                  }
                >
                  {/* Lado izquierdo: muestra del color + nombre + estado */}
                  <div className="min-w-0 flex items-center gap-3">
                    {selectedColor ? (
                      <span
                        className="w-5 h-5 rounded-full border border-black/10 dark:border-white/20 shadow-sm shrink-0"
                        style={{ backgroundColor: selectedColor.codigo_hex }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {row.nombre}
                      </p>
                      {noColors ? (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Sin colores disponibles
                        </p>
                      ) : selectedColor ? (
                        <p className="text-[11px] text-sky-600 dark:text-sky-400">
                          {selectedColor.nombre}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sin color seleccionado
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lado derecho: error o chevron */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {hasError && (
                      <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                        {colorErrors[row.id]}
                      </span>
                    )}
                    {!noColors && (
                      <ChevronDownIcon
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </button>

                {/* Panel de opciones de color (expandible) */}
                {!noColors && (
                  <div
                    className={`grid transition-all duration-200 ease-in-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                    role="radiogroup"
                    aria-label={`Colores disponibles para ${row.nombre}`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-slate-200 dark:border-white/10">
                        <div className="pt-3">
                          <div className="flex flex-wrap gap-2">
                            {colors.map((color) => (
                              <ColorOption
                                key={color.id}
                                color={color}
                                isSelected={selectedColorId === color.id}
                                onSelect={() => onSelectColor(row.id, color.id)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
