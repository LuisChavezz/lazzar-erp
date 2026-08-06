"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchInput } from "@/src/components/SearchInput";
import { CheckIcon } from "@/src/components/Icons";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { PriceInput } from "@/src/components/PriceInput";
import { FormSubmitButton, FormSecondaryButton } from "@/src/components/FormButtons";
import type {
  PurchaseOrderEncabezados,
  PurchaseOrderOnboardingData,
  PurchaseOrderOnboardingProducto,
} from "../interfaces/purchase-order-onboarding.interface";
import { usePostPurchaseOrder } from "../hooks/usePostPurchaseOrder";
import { usePriceEntries } from "../hooks/usePriceEntries";
import { buildPurchaseOrderDetalle } from "../utils/buildPurchaseOrderDetalle";

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

interface PurchaseOrderOnboardingStep2Props {
  /** Captured encabezados from Step 1. */
  step1Data: PurchaseOrderEncabezados;
  onboardingData: PurchaseOrderOnboardingData | undefined;
  /** Called after the full order POST succeeds. This is the wizard's final step. */
  onSuccess?: () => void;
  /** Vuelve al Step 1 (encabezado), conservando lo capturado. */
  onBack: () => void;
}

export function PurchaseOrderOnboardingStep2({
  step1Data,
  onboardingData,
  onSuccess,
  onBack,
}: PurchaseOrderOnboardingStep2Props) {
  // Opt-out del React Compiler: `useVirtualizer` retorna funciones internas
  // que el compilador no puede memoizar de forma segura.
  "use no memo";

  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { prices, setPrice, togglePrice, priceErrors, hasPriceErrors } =
    usePriceEntries(quantities);
  const { mutateAsync: postDetalles, isPending } = usePostPurchaseOrder();
  // Encabezado ya creado por un intento previo cuyo segundo POST (detalles)
  // falló. Se conserva para reintentar solo ese POST en lugar de crear un
  // encabezado duplicado.
  const [pendingOrder, setPendingOrder] = useState<{
    id: number;
    folio: string | null;
  } | null>(null);

  const products = useMemo(
    () => onboardingData?.busqueda.productos ?? [],
    [onboardingData],
  );

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

  // ── Filter by search query ───────────────────────────────────────────────
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

  // ── Selection helpers ────────────────────────────────────────────────────
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
      const product = products.find((p) => p.id === id);
      return (product?.precio_base ?? 0).toFixed(2);
    });
  };

  const updateQuantity = (id: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const isSelected = (id: number) => id in quantities;
  const selectedCount = Object.keys(quantities).length;

  /** Congela los seleccionados actuales, o descarta el snapshot al apagar. */
  const toggleShowOnlySelected = () => {
    setSelectedSnapshot((prev) =>
      prev ? null : products.filter((p) => p.id in quantities),
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

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (selectedCount === 0 || hasPriceErrors) return;

    const detalle = buildPurchaseOrderDetalle(
      quantities,
      prices,
      (productoId) => products.find((p) => p.id === productoId)?.nombre ?? "",
    );

    // Adjunta los renglones a un encabezado ya existente. Si falla, se
    // conserva su id/folio para reintentar solo este POST — evita crear un
    // segundo encabezado duplicado en el reintento.
    const attachDetalle = (ordenCompra: { id: number; folio: string | null }) =>
      postDetalles({ orden_compra_id: ordenCompra.id, detalle })
        .then(() => {
          setPendingOrder(null);
          // Toast is handled by the mutation hook.
          onSuccess?.();
        })
        .catch(() => {
          // Error toast is handled by the mutation hook.
          setPendingOrder(ordenCompra);
        });

    if (pendingOrder) {
      void attachDetalle(pendingOrder);
      return;
    }

    // Step 2 creates the Purchase Order by first posting the encabezados,
    // then posting the detalles with the returned orden_compra id. If this
    // first POST fails, no header was created — a plain retry from scratch
    // is safe, so there's nothing to remember here (unlike attachDetalle's
    // failure above).
    void postDetalles(step1Data)
      .then((createResponse) => attachDetalle(createResponse.orden_compra))
      .catch(() => {
        // Error toast is handled by the mutation hook.
      });
  };

  return (
    <div className="space-y-4">
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
            const selected = isSelected(product.id);
            const qty = quantities[product.id] ?? 1;
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
                    onClick={() => toggleProduct(product.id)}
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

                  {/* Price (read-only, before selection) */}
                  {!selected && (
                    <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                      ${Number(product.precio_base).toFixed(2)}
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

      {/* ── Aviso de encabezado creado sin productos adjuntos ───────────── */}
      {pendingOrder && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          La orden{pendingOrder.folio ? ` ${pendingOrder.folio}` : ""} ya fue
          creada, pero no se pudieron agregar los productos. Vuelve a
          intentar — se reutilizará esa misma orden, no se creará una
          duplicada.
        </p>
      )}

      {/* ── Acciones ───────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        {/*
          Se bloquea el regreso cuando el encabezado ya fue creado en el
          servidor (`pendingOrder`): volver permitiría editarlo, pero ese
          cambio ya no viajaría a ningún lado — "Reintentar" solo adjunta los
          renglones a la orden existente. Mejor impedirlo que perderlo en
          silencio.
        */}
        <FormSecondaryButton
          label="Volver"
          onClick={onBack}
          disabled={isPending || pendingOrder !== null}
          title={
            pendingOrder
              ? "El encabezado ya fue creado; sus datos ya no pueden modificarse desde aquí."
              : undefined
          }
        />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Creando..."
          disabled={selectedCount === 0 || isPending || hasPriceErrors}
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {pendingOrder ? "Reintentar" : "Crear Orden"}
        </FormSubmitButton>
      </div>
    </div>
  );
}
