"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchInput } from "@/src/components/SearchInput";
import { CheckIcon } from "@/src/components/Icons";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { PriceInput } from "@/src/components/PriceInput";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import type { PurchaseOrderOnboardingProducto } from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrderLinesState } from "../hooks/usePurchaseOrderLines";
import {
  lineFromProducto,
  lineKeyProducto,
  type PurchaseOrderLine,
} from "../utils/purchaseOrderLines";
import { PinnedLineRow } from "./PurchaseOrderLineRow";

/**
 * Concatena, en minúsculas, los campos contra los que filtra el buscador.
 *
 * El separador es un salto de línea: no se puede teclear en el input de una
 * sola línea, así que ningún término puede cruzar de un campo al siguiente y
 * la coincidencia sigue siendo por campo, como cuando se evaluaba cada uno
 * por separado.
 */
const buildSearchHaystack = (p: PurchaseOrderOnboardingProducto): string =>
  `${p.nombre}\n${p.descripcion ?? ""}\n${p.codigo ?? ""}\n${p.cod_proscai}`.toLowerCase();

/** ¿El renglón es un producto del catálogo que la lista puede marcar? */
const isProductoLine = (line: PurchaseOrderLine) => line.key === lineKeyProducto(line.producto);

interface PurchaseOrderProductLinesListProps {
  /** Catálogo de productos del onboarding (`busqueda.productos`). */
  catalog: PurchaseOrderOnboardingProducto[];
  lines: PurchaseOrderLinesState;
  /**
   * Renglones guardados de la orden (edición). `[]` en el alta, o si se
   * descartaron al cambiar el tipo de compra.
   */
  seedLines?: PurchaseOrderLine[];
  monedaCodigo: string | null;
}

/**
 * Renglones de una OC de materia prima: el catálogo de productos completo,
 * filtrado en cliente y virtualizado, con cantidad y precio en los marcados.
 * La comparten el Step 2 de alta y el de edición, y solo se monta en MP: una
 * OC de PT no paga el índice de miles de productos (EC-657).
 *
 * En edición, los renglones guardados que la lista no puede representar como
 * un producto —uno por SKU (`v:`) o un producto repetido (`d:`)— van FIJOS
 * arriba con su casilla, para que se vean, se cuenten y se puedan quitar.
 */
export function PurchaseOrderProductLinesList({
  catalog,
  lines,
  seedLines = [],
  monedaCodigo,
}: PurchaseOrderProductLinesListProps) {
  // Opt-out del React Compiler: `useVirtualizer` retorna funciones internas
  // que el compilador no puede memoizar de forma segura.
  "use no memo";

  const [searchQuery, setSearchQuery] = useState("");
  const { quantities, prices, priceErrors } = lines;

  // Renglones guardados por producto (`p:`), indexados por id de producto. Al
  // volver a marcar uno se parte de su descripción y precio reales, no de los
  // del catálogo.
  const seedById = useMemo(
    () => new Map(
      seedLines.filter(isProductoLine).map((l) => [l.producto, l] as const),
    ),
    [seedLines],
  );

  // Fijos arriba: los guardados que no son un producto de la lista (variante o
  // producto repetido), sigan marcados o no.
  const pinned = seedLines.filter((l) => !isProductoLine(l));

  // Lista mostrada: productos del catálogo (bucket de búsqueda) más filas
  // sintéticas para los renglones sembrados ausentes de él, de modo que sean
  // visibles, deseleccionables y se cuenten correctamente.
  const products = useMemo<PurchaseOrderOnboardingProducto[]>(() => {
    const catalogIds = new Set(catalog.map((p) => p.id));
    const synthetic: PurchaseOrderOnboardingProducto[] = [...seedById.values()]
      .filter((l) => !catalogIds.has(l.producto))
      .map((l) => ({
        id: l.producto,
        codigo: null,
        cod_proscai: "",
        nombre: l.descripcion || `Producto #${l.producto}`,
        descripcion: null,
        precio_base: Number(l.precioInicial) || 0,
      }));
    return [...catalog, ...synthetic];
  }, [catalog, seedById]);

  // ── Vista "solo seleccionados" ───────────────────────────────────────────
  // `null` = apagada. Cuando se enciende se congelan los RENGLONES que estaban
  // seleccionados EN ESE MOMENTO: si el usuario deselecciona uno mientras la
  // vista está activa, sigue visible (para poder volver a marcarlo) en lugar
  // de desaparecerle bajo el cursor. Se guardan los productos y no solo sus
  // ids porque, si `products` se reconstruye mientras la vista está encendida,
  // resolver ids contra la lista nueva volvería a hacer desaparecer renglones
  // — justo lo que este congelado evita.
  const [selectedSnapshot, setSelectedSnapshot] = useState<
    PurchaseOrderOnboardingProducto[] | null
  >(null);
  const showOnlySelected = selectedSnapshot !== null;

  // Texto en minúsculas por producto para el filtro: se calcula una vez por
  // catálogo en lugar de re-minusculizar 4 campos de miles de productos en
  // cada tecla.
  const searchHaystacks = useMemo(
    () => new Map(products.map((p) => [p.id, buildSearchHaystack(p)])),
    [products],
  );

  // ── Filtrado por búsqueda ─────────────────────────────────────────────────
  // El snapshot acota el universo ANTES del filtro de texto, así que escribir
  // en "Filtrar productos..." busca dentro de los seleccionados, no en todo
  // el catálogo.
  const filteredProducts = useMemo(() => {
    const base = selectedSnapshot ?? products;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    // El fallback cubre a un renglón congelado que ya no esté en `products`.
    return base.filter((p) =>
      (searchHaystacks.get(p.id) ?? buildSearchHaystack(p)).includes(q),
    );
  }, [products, searchQuery, selectedSnapshot, searchHaystacks]);

  // ── Helpers de selección ──────────────────────────────────────────────────
  const toggleProduct = (product: PurchaseOrderOnboardingProducto) => {
    // Renglones existentes: partir de la descripción y el precio reales de la
    // orden; productos nuevos: del catálogo.
    lines.toggle(seedById.get(product.id) ?? lineFromProducto(product));
  };

  const isSelected = (id: number) => lines.isSelected(lineKeyProducto(id));
  // Cuenta TODOS los renglones marcados, también los fijos de arriba.
  const selectedCount = lines.count;

  /** Congela los seleccionados actuales, o descarta el snapshot al apagar. */
  const toggleShowOnlySelected = () => {
    setSelectedSnapshot((prev) =>
      prev ? null : products.filter((p) => isSelected(p.id)),
    );
  };

  // Sin nada seleccionado no hay vista que mostrar. Solo se deshabilita si
  // además está apagada: con la vista encendida debe seguir siendo pulsable
  // aunque el usuario deseleccione todo, o quedaría atrapado en una lista que
  // ya no puede abandonar.
  const isToggleDisabled = selectedCount === 0 && !showOnlySelected;

  // ── Virtualización de la lista ───────────────────────────────────────────
  // El catálogo ronda los 6,000+ productos: renderizarlos todos satura el DOM.
  // Se virtualiza sobre `filteredProducts` (el filtro corre antes, sobre el
  // arreglo completo) usando como contenedor de scroll el mismo div que ya
  // tenía `overflow-y-auto`.
  const listRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => listRef.current,
    // Altura aproximada de un renglón sin seleccionar; `measureElement` la
    // corrige con la real en cuanto se monta.
    estimateSize: () => 62,
    overscan: 6,
    // Equivale al `space-y-1` que tenía el contenedor antes de virtualizar.
    gap: 4,
    // La medición se cachea por producto (no por índice), así que sobrevive a
    // los cambios de filtro y al scroll. El `?.` cubre el instante en que el
    // virtualizador todavía sostiene un índice de una lista más larga (al
    // encender "Ver solo estos" o al filtrar), que si no reventaría el diálogo.
    getItemKey: (index) => filteredProducts[index]?.id ?? index,
  });

  return (
    <>
      {/* ── Renglones guardados que no son un producto de la lista ──────── */}
      {pinned.length > 0 && (
        <div className="space-y-1">
          {pinned.map((line) => (
            <PinnedLineRow
              key={line.key}
              line={line}
              lines={lines}
              monedaCodigo={monedaCodigo}
              markSinSku={false}
            />
          ))}
        </div>
      )}

      {/* ── Search area ────────────────────────────────────────────────── */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Filtrar productos..."
      />

      {/* ── Selected count (alterna la vista "solo seleccionados") ─────── */}
      <div>
        <button
          type="button"
          onClick={toggleShowOnlySelected}
          aria-pressed={showOnlySelected}
          disabled={isToggleDisabled}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            showOnlySelected
              ? "border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/20 dark:text-sky-300"
              : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400"
          } ${
            isToggleDisabled
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer hover:border-sky-300 hover:text-sky-600 dark:hover:border-sky-700 dark:hover:text-sky-400"
          }`}
        >
          {selectedCount === 0
            ? "Ningún producto seleccionado"
            : `${selectedCount} producto${selectedCount === 1 ? "" : "s"} seleccionado${selectedCount === 1 ? "" : "s"}`}
          {(selectedCount > 0 || showOnlySelected) && (
            <span className="text-[10px] font-semibold opacity-70">
              {showOnlySelected ? " · Ver todos" : " · Ver solo estos"}
            </span>
          )}
        </button>
      </div>

      {/* ── Product list (virtualizada) ────────────────────────────────── */}
      <div ref={listRef} className="max-h-80 overflow-y-auto pr-1">
        {/* Alto total virtual: mantiene la barra de scroll proporcional. */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const product = filteredProducts[virtualItem.index];
            // El índice puede venir de una lista más larga durante el render en
            // que la lista se encoge (encender "Ver solo estos", filtrar).
            if (!product) return null;
            const lineKey = lineKeyProducto(product.id);
            const selected = isSelected(product.id);
            const qty = quantities[lineKey] ?? 1;
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                // `measureElement` mide el alto real y observa el nodo con un
                // ResizeObserver: al seleccionar un renglón aparecen el stepper
                // y el precio editable (y, si el precio queda inválido, su
                // mensaje de error), crece de alto y el virtualizador reacomoda
                // los de abajo solo.
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-150 ${
                    selected
                      ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                      : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
                  }`}
                >
                  {/* Clickable area: check + info */}
                  <button
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-none p-0"
                  >
                    {/* Check indicator */}
                    <span
                      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selected
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {selected && <CheckIcon className="w-3.5 h-3.5" />}
                    </span>

                    {/* Product info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {product.nombre}
                      </p>
                      {product.descripcion && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {product.descripcion}
                        </p>
                      )}
                      {(product.codigo || product.cod_proscai) && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {[product.codigo, product.cod_proscai]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Quantity + price inputs (only when selected) */}
                  {selected && (
                    <div className="shrink-0 flex items-center gap-2">
                      <QuantitySelector
                        value={qty}
                        onChange={(next) => lines.setQuantity(lineKey, next)}
                        label={`Cantidad de ${product.nombre}`}
                      />
                      <PriceInput
                        value={prices[lineKey] ?? ""}
                        onChange={(next) => lines.setPrice(lineKey, next)}
                        error={priceErrors[lineKey]}
                        monedaCodigo={monedaCodigo}
                        label={`Precio de ${product.nombre}`}
                      />
                    </div>
                  )}

                  {/* Price (read-only, before selection) */}
                  {!selected && (
                    <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                      {/* Sin símbolo: `precio_base` no declara moneda (EC-606). */}
                      {formatMoneyValue(product.precio_base, null)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            {searchQuery
              ? "No se encontraron productos"
              : "No hay productos disponibles"}
          </div>
        )}
      </div>
    </>
  );
}
