"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchInput } from "@/src/components/SearchInput";
import { CheckIcon } from "@/src/components/Icons";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { PriceInput } from "@/src/components/PriceInput";
import { FormSubmitButton, FormSecondaryButton } from "@/src/components/FormButtons";
import type {
  PurchaseOrderOnboardingData,
  PurchaseOrderOnboardingProducto,
} from "../interfaces/purchase-order-onboarding.interface";
import type {
  PurchaseOrder,
  UpdatePurchaseOrderBody,
} from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditHeader } from "../schemas/purchase-order-edit.schema";
import type { PurchaseOrderLinesState } from "../hooks/usePurchaseOrderLines";
import { useUpdatePurchaseOrder } from "../hooks/useUpdatePurchaseOrder";
import { buildPurchaseOrderDetalle } from "../utils/buildPurchaseOrderDetalle";
import {
  lineFromProducto,
  lineKeyProducto,
  type PurchaseOrderLine,
} from "../utils/purchaseOrderLines";
import { PurchaseOrderVariantLinesPicker } from "./PurchaseOrderVariantLinesPicker";
import type { PurchaseOrderHeaderFieldErrors } from "../utils/purchaseOrderHeaderErrors";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { onboardingMonedaCodigo } from "../utils/onboardingMonedaCodigo";

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

interface PurchaseOrderEditStep2Props {
  /** Orden en edición — aporta el `pk` para el PUT. */
  initialData: PurchaseOrder;
  /** Encabezado capturado en el Step 1. */
  header: PurchaseOrderEditHeader;
  /**
   * La orden ya tiene folio: `tipo_compra` NO viaja en el PUT (el backend
   * rechaza cambiarlo y el Step 1 lo bloquea).
   */
  isTipoCompraLocked: boolean;
  /** Catálogos (incluye los productos disponibles). */
  onboardingData: PurchaseOrderOnboardingData;
  /**
   * Renglones guardados de la orden (`[]` si se descartaron al cambiar el tipo
   * de compra). Siguen a la vista aunque se desmarquen, para poder volver a
   * marcarlos; los marcados viven en `lines`.
   */
  seedLines: PurchaseOrderLine[];
  /**
   * Renglones elegidos, sembrados con los guardados. Viven en el step manager
   * para que el Step 1 pueda vaciarlos al cambiar el tipo de compra.
   */
  lines: PurchaseOrderLinesState;
  /** Llamado tras un PUT exitoso — paso final del wizard. */
  onSuccess: () => void;
  /**
   * Llamado cuando el backend rechaza el PUT porque la orden ya no puede
   * editarse: cancelada, con recepciones o facturas (400) o eliminada (404).
   * Ver `useUpdatePurchaseOrder`.
   */
  onOrderNoLongerEditable: () => void;
  /**
   * El backend rechazó campos del encabezado (400 por campo): el manager
   * regresa al Step 1 para mostrarlos bajo su campo.
   */
  onHeaderFieldErrors: (errors: PurchaseOrderHeaderFieldErrors) => void;
  /** Vuelve al Step 1 (encabezado). */
  onBack: () => void;
}

/**
 * Step 2 del flujo de edición: selección de productos y guardado.
 *
 * Reproduce la UI del paso de productos del alta, pero pre-poblada con los
 * renglones existentes de la orden (por producto, o por variante en los de
 * producto terminado capturados por SKU). Al guardar, arma el
 * body (encabezado del Step 1 + `detalles`) y envía el PUT vía
 * {@link useUpdatePurchaseOrder} — este es el paso final del wizard.
 */
export function PurchaseOrderEditStep2({
  initialData,
  header,
  isTipoCompraLocked,
  onboardingData,
  seedLines,
  lines,
  onSuccess,
  onOrderNoLongerEditable,
  onHeaderFieldErrors,
  onBack,
}: PurchaseOrderEditStep2Props) {
  // Opt-out del React Compiler: `useVirtualizer` retorna funciones internas
  // que el compilador no puede memoizar de forma segura.
  "use no memo";

  // Código de la moneda elegida en el encabezado: prefijo de los precios
  // capturados (EC-606); sin moneda resuelta, sin prefijo.
  const monedaCodigo = onboardingMonedaCodigo(onboardingData, header.moneda);

  const { mutate: update, isPending } = useUpdatePurchaseOrder({
    onOrderNoLongerEditable,
    onHeaderFieldErrors,
  });
  // Producto terminado se compra por SKU (EC-657); materia prima, por producto.
  const isProductoTerminado = header.tipo_compra === "PT";

  const [searchQuery, setSearchQuery] = useState("");
  const { quantities, prices, priceErrors, hasPriceErrors } = lines;

  // Renglones guardados POR PRODUCTO (la lista de materia prima no muestra
  // variantes), indexados por id de producto. Al volver a marcar uno se parte
  // de su descripción y precio reales, no de los del catálogo.
  const seedById = useMemo(
    () => new Map(
      seedLines
        .filter((l) => l.productoVariante === null)
        .map((l) => [l.producto, l] as const),
    ),
    [seedLines],
  );

  // Lista mostrada: productos del catálogo (bucket de búsqueda) más filas
  // sintéticas para los renglones sembrados ausentes de él, de modo que sean
  // visibles, deseleccionables y se cuenten correctamente.
  const products = useMemo<PurchaseOrderOnboardingProducto[]>(() => {
    const catalog = onboardingData.busqueda.productos ?? [];
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
  }, [onboardingData, seedById]);

  // ── Vista "solo seleccionados" ───────────────────────────────────────────
  // `null` = apagada. Cuando se enciende se congelan los RENGLONES que estaban
  // seleccionados EN ESE MOMENTO: si el usuario deselecciona uno mientras la
  // vista está activa, sigue visible (para poder volver a marcarlo) en lugar
  // de desaparecerle bajo el cursor. Incluye los renglones sintéticos
  // (productos de la orden que ya no están en el bucket del catálogo), porque
  // forman parte de la orden igual que los demás.
  //
  // Se guardan los productos y no solo sus ids: si `initialItems` cambia de
  // identidad por un refetch en segundo plano, `products` se reconstruye y
  // resolver ids contra la lista nueva haría desaparecer renglones de la vista
  // supuestamente congelada — justo lo que este congelado evita.
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

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (selectedCount === 0 || hasPriceErrors) return;

    const detalle = buildPurchaseOrderDetalle(lines.lines, quantities, prices);

    // El PUT refleja la forma del alta: encabezado + renglones del detalle.
    // `pedidos` va SIEMPRE (reemplaza la lista completa); `tipo_compra` solo
    // sin folio. El campo legado `pedido` nunca se manda.
    const { tipo_compra, ...headerWithoutTipo } = header;
    const body: UpdatePurchaseOrderBody = isTipoCompraLocked
      ? { ...headerWithoutTipo, detalles: detalle }
      : { ...headerWithoutTipo, tipo_compra, detalles: detalle };
    update(
      { pk: initialData.id, body },
      { onSuccess: () => onSuccess() },
    );
  };

  return (
    <div className="space-y-4">
      {isProductoTerminado ? (
        <PurchaseOrderVariantLinesPicker
          lines={lines}
          seedLines={seedLines}
          monedaCodigo={monedaCodigo}
        />
      ) : (
        <>
          {/* ── Búsqueda ───────────────────────────────────────────────────── */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Filtrar productos..."
          />

          {/* ── Conteo de seleccionados (alterna "solo seleccionados") ─────── */}
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

          {/* ── Lista de productos (virtualizada) ──────────────────────────── */}
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
                    // `measureElement` observa el tamaño real (ResizeObserver): al
                    // seleccionar un renglón aparecen el stepper y el precio
                    // editable, crece de alto y el virtualizador reacomoda los de
                    // abajo automáticamente.
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
                      <button
                        type="button"
                        onClick={() => toggleProduct(product)}
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
                          {(product.codigo || product.cod_proscai) && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {[product.codigo, product.cod_proscai]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </button>

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
      )}

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
