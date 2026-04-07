/**
 * useProductSelection.ts
 * Hook para gestionar la búsqueda y selección de productos dentro del diálogo.
 * - Mantiene el texto de búsqueda y la versión diferida para rendimiento.
 * - Construye las filas del catálogo a partir de los productos recibidos.
 * - Mantiene el conjunto de filas seleccionadas y el producto "abierto" (detalles).
 * - Expone utilidades para alternar selección, abrir/ocultar producto y reiniciar estado.
 */
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { Product } from "../../products/interfaces/product.interface";
import type { CatalogRow, QuoteItem } from "../types";

/**
 * buildSelectedRowIds
 * Construye el Set inicial de ids seleccionados a partir de un `QuoteItem` opcional.
 */
const buildSelectedRowIds = (item?: QuoteItem | null): Set<number> =>
  item?.productoId ? new Set([item.productoId]) : new Set<number>();

export interface UseProductSelectionParams {
  products: Partial<Product>[];
  initialItem?: QuoteItem | null;
}
/**
 * useProductSelection
 * Provee el estado y las acciones necesarias para la selección de productos
 * dentro del flujo de agregar productos. Retorna `rows`, `filteredRows`,
 * `selectedRowIds`, `openProductId` y las funciones para manipularlos.
 */
export function useProductSelection({
  products,
  initialItem,
}: UseProductSelectionParams) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(() =>
    buildSelectedRowIds(initialItem)
  );
  const [openProductId, setOpenProductId] = useState<number | null>(
    initialItem?.productoId ?? null
  );

  const rows = useMemo<CatalogRow[]>(() => {
    return (products || [])
      .map((product) => {
        if (!product.id) return null;
        const precio = Number(product.precio_base);
        return {
          id: product.id,
          nombre: product.nombre ?? "",
          descripcion: product.descripcion ?? "",
          unidad: "PZA",
          precio: Number.isFinite(precio) ? precio : 0,
          isActive: product.activo ?? true,
          productoId: product.id,
        } as CatalogRow;
      })
      .filter((row): row is CatalogRow => Boolean(row))
      .filter((row) => row.isActive)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [products]);

  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const haystack = `${row.nombre} ${row.descripcion}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, rows]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowIds.has(row.id)),
    [rows, selectedRowIds]
  );

  const toggleRow = useCallback((row: CatalogRow) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  }, []);

  const toggleProduct = useCallback((id: number) => {
    setOpenProductId((prev) => (prev === id ? null : id));
  }, []);

  const openFirstSelectedProduct = useCallback(() => {
    setOpenProductId([...selectedRowIds][0] ?? null);
  }, [selectedRowIds]);

  const reset = useCallback((item?: QuoteItem | null) => {
    setSearch("");
    setSelectedRowIds(buildSelectedRowIds(item));
    setOpenProductId(item?.productoId ?? null);
  }, []);

  return {
    search,
    setSearch,
    rows,
    filteredRows,
    selectedRowIds,
    selectedRows,
    openProductId,
    setOpenProductId,
    toggleRow,
    toggleProduct,
    openFirstSelectedProduct,
    reset,
  };
}
