"use client";

import { CheckCircleIcon } from "@/src/components/Icons";
import { CatalogRow } from "../hooks/useAddProductsDialog";

interface AddProductsSelectableItemProps {
  row: CatalogRow;
  isSelected: boolean;
  isAlreadyAdded: boolean;
  onToggle: (row: CatalogRow) => void;
}

export function AddProductsSelectableItem({
  row,
  isSelected,
  isAlreadyAdded,
  onToggle,
}: AddProductsSelectableItemProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(row)}
      disabled={isAlreadyAdded}
      className={`w-full text-left p-3 rounded-2xl border flex gap-3 items-start transition-colors ${
        isAlreadyAdded
          ? "border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-zinc-900/40 opacity-60 cursor-not-allowed"
          : isSelected
          ? "border-sky-200 dark:border-sky-700 bg-sky-50/70 dark:bg-sky-500/10 hover:bg-sky-50 dark:hover:bg-sky-500/20 cursor-pointer"
          : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
      }`}
      role="listitem"
      aria-label={`Seleccionar ${row.sku}`}
    >
      <div className="pt-0.5">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
            isSelected
              ? "border-sky-300 dark:border-sky-600 bg-sky-100 dark:bg-sky-500/20"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900"
          }`}
          aria-hidden="true"
        >
          {isSelected && <CheckCircleIcon className="w-4 h-4 text-sky-600" />}
        </span>
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
            {row.nombre}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 line-clamp-2">
            {row.sku} · {row.unidad}
            {row.descripcion ? ` · ${row.descripcion}` : ""}
          </p>
        </div>
        <div className="flex items-end flex-col gap-1">
          {isAlreadyAdded ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              Ya agregado
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
              SKU: {row.sku}
            </span>
          )}
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            Precio: ${row.precio.toFixed(2)}
          </span>
        </div>
      </div>
    </button>
  );
}

