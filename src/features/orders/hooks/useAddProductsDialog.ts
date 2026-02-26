"use client";

import { useMemo, useState } from "react";
import { useProductStore } from "../../products/stores/product.store";
import { useProductVariantStore } from "../../product-variants/stores/product-variant.store";
import { useUnitOfMeasureStore } from "../../units-of-measure/stores/unit-of-measure.store";
import { OrderFormValues } from "../schema/order.schema";

type OrderItem = OrderFormValues["items"][number];

export interface CatalogRow {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: number;
  isActive: boolean;
}

interface UseAddProductsDialogParams {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkus: Set<string>;
  onAddItems: (items: OrderItem[]) => void;
}

export function useAddProductsDialog({
  open,
  onOpenChange,
  existingSkus,
  onAddItems,
}: UseAddProductsDialogParams) {
  const products = useProductStore((s) => s.products);
  const productVariants = useProductVariantStore((s) => s.productVariants);
  const units = useUnitOfMeasureStore((s) => s.units);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("");
      setSelectedIds(new Set());
    }
    onOpenChange(nextOpen);
  };

  const rows = useMemo<CatalogRow[]>(() => {
    const productsById = new Map(products.map((p) => [p.id, p]));
    const unitsById = new Map(units.map((u) => [u.id, u]));

    return (productVariants || [])
      .map((variant) => {
        const product = productsById.get(variant.producto_id);
        if (!product) return null;
        const unit = unitsById.get(product.unidad_medida_id);
        const precio = Number(variant.precio_base);
        return {
          id: variant.id,
          sku: variant.sku ?? "",
          nombre: product.nombre ?? "",
          descripcion: product.descripcion ?? "",
          unidad: unit?.clave ?? "PZA",
          precio: Number.isFinite(precio) ? precio : 0,
          isActive: Boolean(variant.activo) && Boolean(product.activo),
        } satisfies CatalogRow;
      })
      .filter((r): r is CatalogRow => Boolean(r))
      .filter((r) => r.isActive)
      .sort((a, b) => a.sku.localeCompare(b.sku, "es"));
  }, [productVariants, products, units]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const haystack = `${r.sku} ${r.nombre} ${r.descripcion} ${r.unidad}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const selectableSelectedCount = useMemo(() => {
    let count = 0;
    selectedIds.forEach((id) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      if (existingSkus.has(row.sku)) return;
      count += 1;
    });
    return count;
  }, [existingSkus, rows, selectedIds]);

  const toggleRow = (row: CatalogRow) => {
    if (existingSkus.has(row.sku)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  };

  const isSelected = (rowId: number) => selectedIds.has(rowId);
  const isAlreadyAdded = (sku: string) => existingSkus.has(sku);

  const handleAddSelected = () => {
    const itemsToAdd: OrderItem[] = rows
      .filter((r) => selectedIds.has(r.id))
      .filter((r) => !existingSkus.has(r.sku))
      .map((r) => ({
        sku: r.sku,
        descripcion: r.nombre,
        unidad: r.unidad,
        cantidad: 1,
        precio: r.precio,
        descuento: 0,
        importe: 0,
      }));

    if (itemsToAdd.length === 0) {
      return;
    }

    onAddItems(itemsToAdd);
  };

  return {
    open,
    search,
    setSearch,
    rows,
    filteredRows,
    selectableSelectedCount,
    handleOpenChange,
    toggleRow,
    handleAddSelected,
    isSelected,
    isAlreadyAdded,
  };
}

