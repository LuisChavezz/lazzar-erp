"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/src/components/SearchInput";
import { CheckIcon } from "@/src/components/Icons";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { PriceInput } from "@/src/components/PriceInput";
import { FormSubmitButton, FormSecondaryButton } from "@/src/components/FormButtons";
import type {
  PurchaseOrderDetalleItem,
  PurchaseOrderOnboardingData,
  PurchaseOrderOnboardingProducto,
} from "../interfaces/purchase-order-onboarding.interface";
import type {
  PurchaseOrder,
  UpdatePurchaseOrderBody,
} from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditFormValues } from "../schemas/purchase-order-edit.schema";
import { usePriceEntries } from "../hooks/usePriceEntries";
import { useUpdatePurchaseOrder } from "../hooks/useUpdatePurchaseOrder";
import { buildPurchaseOrderDetalle } from "../utils/buildPurchaseOrderDetalle";

interface PurchaseOrderEditStep2Props {
  /** Orden en edición — aporta el `pk` para el PUT. */
  initialData: PurchaseOrder;
  /** Encabezado capturado en el Step 1. */
  header: PurchaseOrderEditFormValues;
  /** Catálogos (incluye los productos disponibles). */
  onboardingData: PurchaseOrderOnboardingData;
  /** Renglones iniciales (producto, cantidad, precio, descripcion), sembrados desde los renglones existentes de la orden. */
  initialItems: PurchaseOrderDetalleItem[];
  /** Llamado tras un PUT exitoso — paso final del wizard. */
  onSuccess: () => void;
  /** Vuelve al Step 1 (encabezado). */
  onBack: () => void;
}

/**
 * Step 2 del flujo de edición: selección de productos y guardado.
 *
 * Reproduce la UI del paso de productos del alta, pero pre-poblada con los
 * renglones existentes de la orden (vía `producto_id`). Al guardar, arma el
 * body (encabezado del Step 1 + `detalles`) y envía el PUT vía
 * {@link useUpdatePurchaseOrder} — este es el paso final del wizard.
 */
export function PurchaseOrderEditStep2({
  initialData,
  header,
  onboardingData,
  initialItems,
  onSuccess,
  onBack,
}: PurchaseOrderEditStep2Props) {
  const { mutate: update, isPending } = useUpdatePurchaseOrder();
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(initialItems.map((i) => [i.producto, i.cantidad] as const)),
  );
  const { prices, setPrice, togglePrice, priceErrors, hasPriceErrors } = usePriceEntries(
    quantities,
    () => Object.fromEntries(initialItems.map((i) => [i.producto, i.precio] as const)),
  );

  // `quantities`/`prices` se siembran una sola vez al montar. `initialItems`
  // (y por lo tanto `seedById`/`products`, ambos derivados vía `useMemo`) sí
  // puede cambiar de referencia después del montaje si la orden se refetchea
  // en segundo plano mientras este diálogo sigue abierto (p. ej. otra acción
  // invalida la misma queryKey `purchase-orders`). En ese caso no
  // sobreescribimos silenciosamente la selección del usuario — solo lo
  // avisamos, para que decida recargar antes de guardar. Se ajusta durante
  // el render (patrón documentado de React para detectar cambios de props
  // respecto al render anterior) en lugar de en un efecto, para no disparar
  // un set-state-en-efecto que el compilador de React desaconseja.
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setIsOutOfSync(true);
  }

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
    togglePrice(id, () => {
      // Renglones existentes: partir del precio real de la orden; productos
      // nuevos: partir del catálogo.
      const seed = seedById.get(id);
      const product = products.find((p) => p.id === id);
      return seed?.precio ?? product?.precio_base.toFixed(2) ?? "0.00";
    });
  };

  const updateQuantity = (id: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const isSelected = (id: number) => id in quantities;
  const selectedCount = Object.keys(quantities).length;

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (selectedCount === 0 || hasPriceErrors) return;

    const detalle = buildPurchaseOrderDetalle(quantities, prices, (productoId) => {
      const seed = seedById.get(productoId);
      const product = products.find((p) => p.id === productoId);
      return seed?.descripcion ?? product?.nombre ?? "";
    });

    // El PUT refleja la forma del alta: encabezado + renglones del detalle.
    const body: UpdatePurchaseOrderBody = { ...header, detalles: detalle };
    update(
      { pk: initialData.id, body },
      { onSuccess: () => onSuccess() },
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Aviso: la orden cambió mientras el diálogo seguía abierto ───── */}
      {isOutOfSync && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Esta orden se actualizó en otro lugar mientras la editabas. Cierra y
          vuelve a abrir el diálogo para partir de los datos más recientes
          antes de guardar.
        </div>
      )}

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
                <div className="shrink-0 flex items-center gap-2">
                  <QuantitySelector
                    value={qty}
                    onChange={(next) => updateQuantity(product.id, next)}
                    label={`Cantidad de ${product.nombre}`}
                  />
                  <PriceInput
                    value={prices[product.id] ?? ""}
                    onChange={(next) => setPrice(product.id, next)}
                    error={priceErrors[product.id]}
                    label={`Precio de ${product.nombre}`}
                  />
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
        <FormSecondaryButton label="Volver" onClick={onBack} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          disabled={selectedCount === 0 || hasPriceErrors || isPending}
          onClick={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          Guardar cambios
        </FormSubmitButton>
      </div>
    </div>
  );
}
