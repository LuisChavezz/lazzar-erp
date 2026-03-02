import type { CatalogRow } from "../hooks/useAddProductsDialog";
import type { Size } from "../../sizes/interfaces/size.interface";

interface StepSizesProps {
  selectedRow: CatalogRow | null;
  selectedColor: { codigo_hex: string; nombre: string } | null;
  sizes: Size[];
  isLoadingSizes: boolean;
  mergedSizeQuantities: Record<number, number>;
  updateSizeQuantity: (sizeId: number, value: number) => void;
  totalCantidad: number;
  hasEmbroidery: boolean;
  onToggleEmbroidery: (next: boolean) => void;
}

export function StepSizes({
  selectedRow,
  selectedColor,
  sizes,
  isLoadingSizes,
  mergedSizeQuantities,
  updateSizeQuantity,
  totalCantidad,
  hasEmbroidery,
  onToggleEmbroidery,
}: StepSizesProps) {
  return (
    <div className="space-y-5 mt-2">
      {selectedRow ? (
        <div className="mt-2 rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/60 dark:bg-white/5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {selectedRow.nombre}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {selectedRow.sku} · {selectedRow.unidad}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Precio base</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                ${selectedRow.precio.toFixed(2)}
              </p>
            </div>
          </div>
          {selectedColor ? (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span
                className="w-3 h-3 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: `#${selectedColor.codigo_hex}` }}
                aria-hidden="true"
              />
              <span>Color: {selectedColor.nombre}</span>
            </div>
          ) : null}
          {selectedRow.descripcion ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedRow.descripcion}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Selecciona tallas
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Asigna cantidades por talla.
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            Total: {totalCantidad}
          </div>
        </div>

        {isLoadingSizes ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Cargando tallas...</div>
        ) : sizes.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No hay tallas disponibles.
          </div>
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
                  value={mergedSizeQuantities[size.id] ?? ""}
                  onChange={(event) => updateSizeQuantity(size.id, Number(event.target.value))}
                  aria-label={`Cantidad talla ${size.nombre}`}
                  className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 px-2 py-1 text-right text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <label
        className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
        htmlFor="add-product-bordados"
      >
        <input
          id="add-product-bordados"
          type="checkbox"
          checked={hasEmbroidery}
          onChange={(event) => onToggleEmbroidery(event.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        Bordados
      </label>
    </div>
  );
}
