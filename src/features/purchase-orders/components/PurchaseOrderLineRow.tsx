"use client";

import { CheckIcon } from "@/src/components/Icons";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { PriceInput } from "@/src/components/PriceInput";
import type { PurchaseOrderLinesState } from "../hooks/usePurchaseOrderLines";
import type { PurchaseOrderLine } from "../utils/purchaseOrderLines";

/**
 * Filas de renglón de OC compartidas por el selector de variantes (PT) y la
 * lista de productos (MP): un renglón FIJO con su casilla, SKU · producto (o
 * "Sin SKU") y, marcado, su cantidad y precio.
 */
export function PinnedLineRow({
  line,
  lines,
  monedaCodigo,
  markSinSku = true,
}: {
  line: PurchaseOrderLine;
  lines: PurchaseOrderLinesState;
  monedaCodigo: string | null;
  /** Marca "Sin SKU" los renglones sin variante; solo tiene sentido en PT. */
  markSinSku?: boolean;
}) {
  const selected = lines.isSelected(line.key);
  const label = line.sku ?? line.nombre;
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-150 ${
        selected
          ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
          : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
      }`}
    >
      <button
        type="button"
        onClick={() => lines.toggle(line)}
        aria-pressed={selected}
        aria-label={`${selected ? "Quitar" : "Agregar"} ${label}`}
        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-none p-0"
      >
        <CheckBox selected={selected} />
        <LineInfo line={line} markSinSku={markSinSku} />
      </button>

      {selected && (
        <div className="shrink-0 flex items-center gap-2">
          <QuantitySelector
            value={lines.quantities[line.key] ?? 1}
            onChange={(next) => lines.setQuantity(line.key, next)}
            label={`Cantidad de ${label}`}
          />
          <PriceInput
            value={lines.prices[line.key] ?? ""}
            onChange={(next) => lines.setPrice(line.key, next)}
            error={lines.priceErrors[line.key]}
            monedaCodigo={monedaCodigo}
            label={`Precio de ${label}`}
          />
        </div>
      )}
    </div>
  );
}

export function CheckBox({ selected }: { selected: boolean }) {
  return (
    <span
      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        selected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 dark:border-slate-600"
      }`}
    >
      {selected && <CheckIcon className="w-3.5 h-3.5" />}
    </span>
  );
}

/** SKU + producto (+ color · talla si se conocen); sin variante, "Sin SKU". */
export function LineInfo({
  line,
  markSinSku = true,
}: {
  line: PurchaseOrderLine;
  markSinSku?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
        {line.sku ? (
          <>
            {line.sku}
            <span className="font-normal text-slate-500 dark:text-slate-400"> · {line.nombre}</span>
          </>
        ) : (
          line.nombre
        )}
      </p>
      {line.sku === null ? (
        markSinSku && (
          <span
            className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            title="Renglón capturado antes de la compra por SKU: se conserva tal cual, por producto."
          >
            Sin SKU
          </span>
        )
      ) : (
        line.atributos && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{line.atributos}</p>
        )
      )}
    </div>
  );
}
