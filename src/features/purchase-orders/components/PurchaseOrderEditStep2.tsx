"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/src/components/SearchInput";
import { CheckIcon, PlusIcon } from "@/src/components/Icons";
import { FormSubmitButton, FormSecondaryButton } from "@/src/components/FormButtons";
import type {
  PurchaseOrderDetalleItem,
  PurchaseOrderOnboardingData,
  PurchaseOrderOnboardingProducto,
} from "../interfaces/purchase-order-onboarding.interface";

interface PurchaseOrderEditStep2Props {
  /** Catálogos (incluye los productos disponibles). */
  onboardingData: PurchaseOrderOnboardingData;
  /**
   * Renglones iniciales (producto, cantidad, precio, descripcion), sembrados
   * desde los renglones existentes de la orden o desde una selección previa al
   * volver del Step 3.
   */
  initialItems: PurchaseOrderDetalleItem[];
  /** Emite el detalle seleccionado y avanza a la revisión. */
  onSuccess: (detalle: PurchaseOrderDetalleItem[]) => void;
  /** Vuelve al Step 1 (encabezado). */
  onBack: () => void;
}

/**
 * Step 2 del flujo de edición: selección de productos.
 *
 * Reproduce la UI del paso de productos del alta, pero pre-poblada con los
 * renglones existentes de la orden (vía `producto_id`) y SIN realizar ninguna
 * llamada al API: al continuar, emite el detalle al step manager, que lo enviará
 * en `detalles` dentro del PUT (ver Step 3).
 */
export function PurchaseOrderEditStep2({
  onboardingData,
  initialItems,
  onSuccess,
  onBack,
}: PurchaseOrderEditStep2Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(initialItems.map((i) => [i.producto, i.cantidad] as const)),
  );

  // Datos de los renglones sembrados, indexados por id de producto. Se usan como
  // respaldo para mostrar nombre/precio reales cuando un producto de la orden no
  // está en el bucket de búsqueda del catálogo.
  const seedById = useMemo(
    () => new Map(initialItems.map((i) => [i.producto, i])),
    [initialItems],
  );

  // Lista mostrada: productos del catálogo (bucket de búsqueda) más filas
  // sintéticas para los renglones sembrados ausentes de él, de modo que sean
  // visibles, deseleccionables y se cuenten correctamente.
  const products = useMemo<PurchaseOrderOnboardingProducto[]>(() => {
    const catalog = onboardingData.busqueda.productos ?? [];
    const catalogIds = new Set(catalog.map((p) => p.id));
    const synthetic: PurchaseOrderOnboardingProducto[] = initialItems
      .filter((i) => !catalogIds.has(i.producto))
      .map((i) => ({
        id: i.producto,
        nombre: i.descripcion || `Producto #${i.producto}`,
        descripcion: null,
        precio_base: Number(i.precio) || 0,
      }));
    return [...catalog, ...synthetic];
  }, [onboardingData, initialItems]);

  // ── Filtrado por búsqueda ─────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion?.toLowerCase() ?? "").includes(q),
    );
  }, [products, searchQuery]);

  // ── Helpers de selección ──────────────────────────────────────────────────
  const toggleProduct = (id: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const updateQuantity = (id: number, raw: string) => {
    const sanitized = raw.replace(/[^0-9]/g, "");
    const qty = sanitized === "" ? 1 : Math.max(1, parseInt(sanitized, 10) || 1);
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const isSelected = (id: number) => id in quantities;
  const selectedCount = Object.keys(quantities).length;

  // ── Continuar ─────────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (selectedCount === 0) return;

    const detalle: PurchaseOrderDetalleItem[] = Object.entries(quantities).map(
      ([productoIdStr, cantidad]) => {
        const productoId = Number(productoIdStr);
        const seed = seedById.get(productoId);
        const product = products.find((p) => p.id === productoId);
        return {
          producto: productoId,
          cantidad,
          // Renglones existentes: conservar precio/descripcion reales de la
          // orden; productos nuevos: tomar del catálogo.
          precio: seed?.precio ?? product?.precio_base.toFixed(2) ?? "0.00",
          descripcion: seed?.descripcion ?? product?.nombre ?? "",
        };
      },
    );

    onSuccess(detalle);
  };

  return (
    <div className="space-y-4">
      {/* ── Búsqueda ───────────────────────────────────────────────────── */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Filtrar productos..."
      />

      {/* ── Conteo de seleccionados ────────────────────────────────────── */}
      <p className="text-xs text-slate-500 font-medium">
        {selectedCount === 0
          ? "Ningún producto seleccionado"
          : `${selectedCount} producto${selectedCount === 1 ? "" : "s"} seleccionado${selectedCount === 1 ? "" : "s"}`}
      </p>

      {/* ── Lista de productos ─────────────────────────────────────────── */}
      <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
        {filteredProducts.map((product) => {
          const selected = isSelected(product.id);
          const qty = quantities[product.id] ?? 1;
          return (
            <div
              key={product.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-150 ${
                selected
                  ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                  : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleProduct(product.id)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-none p-0"
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    selected
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {selected && <CheckIcon className="w-3.5 h-3.5" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {product.nombre}
                  </p>
                  {product.descripcion && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {product.descripcion}
                    </p>
                  )}
                </div>
              </button>

              {selected && (
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, String(Math.max(1, qty - 1)))}
                    className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
                    aria-label="Reducir cantidad"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 12h14"/></svg>
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => updateQuantity(product.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-12 text-center text-sm font-semibold bg-transparent border border-slate-300 dark:border-slate-600 rounded-md py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                    aria-label={`Cantidad de ${product.nombre}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, String(qty + 1))}
                    className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
                    aria-label="Aumentar cantidad"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {!selected && (
                <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                  ${Number(product.precio_base).toFixed(2)}
                </span>
              )}
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            {searchQuery
              ? "No se encontraron productos"
              : "No hay productos disponibles"}
          </div>
        )}
      </div>

      {/* ── Acciones ────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <FormSecondaryButton label="Volver" onClick={onBack} />
        <FormSubmitButton
          isPending={false}
          disabled={selectedCount === 0}
          onClick={(e) => {
            e.preventDefault();
            handleContinue();
          }}
        >
          Continuar
        </FormSubmitButton>
      </div>
    </div>
  );
}
