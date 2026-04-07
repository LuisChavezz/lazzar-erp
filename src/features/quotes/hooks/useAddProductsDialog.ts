"use client";

import { useState, useMemo } from "react";
import { useProducts } from "../../products/hooks/useProducts";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { QuoteFormValues } from "../schemas/quote.schema";

type QuoteItem = QuoteFormValues["items"][number];

export interface CatalogRow {
  id: number;
  productoId: number;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: number;
  isActive: boolean;
}

interface UseAddProductsDialogParams {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProductIds: Set<number>;
  onAddItems: (items: QuoteItem[]) => void;
}

export function useAddProductsDialog({
  open,
  onOpenChange,
  existingProductIds,
  onAddItems,
}: UseAddProductsDialogParams) {
  const { products } = useProducts();
  const { units } = useUnitsOfMeasure();

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
    const unitsById = new Map(units.map((u) => [u.id, u]));

    return (products || [])
      .map((product) => {
        const unit = unitsById.get(product.unidad_medida);
        const precio = Number(product.precio_base);
        return {
          id: product.id,
          productoId: product.id,
          nombre: product.nombre ?? "",
          descripcion: product.descripcion ?? "",
          unidad: unit?.clave ?? "PZA",
          precio: Number.isFinite(precio) ? precio : 0,
          isActive: Boolean(product.activo),
        } satisfies CatalogRow;
      })
      .filter((r): r is CatalogRow => Boolean(r))
      .filter((r) => r.isActive)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [products, units]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const haystack = `${r.nombre} ${r.descripcion} ${r.unidad}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const selectableSelectedCount = useMemo(() => {
    let count = 0;
    selectedIds.forEach((id) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      if (existingProductIds.has(row.productoId)) return;
      count += 1;
    });
    return count;
  }, [existingProductIds, rows, selectedIds]);

  const toggleRow = (row: CatalogRow) => {
    if (existingProductIds.has(row.productoId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  };

  const isSelected = (rowId: number) => selectedIds.has(rowId);
  const isAlreadyAdded = (productoId: number) => existingProductIds.has(productoId);

  const handleAddSelected = () => {
    const itemsToAdd: QuoteItem[] = rows
      .filter((r) => selectedIds.has(r.id))
      .filter((r) => !existingProductIds.has(r.productoId))
      .map((r) => ({
        productoId: r.productoId,
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
