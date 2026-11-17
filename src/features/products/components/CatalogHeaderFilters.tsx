"use client";

import { useState } from "react";
import type { Column } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import {
  ServerSearchHeaderFilter,
  useColumnServerFilterValue,
} from "@/src/components/ServerSearchHeaderFilter";
import { ALL_FILTER_OPTION, optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import { useColors } from "../../colors/hooks/useColors";
import { useSizes } from "../../sizes/hooks/useSizes";
import { compareSizes } from "../../pre-orders/utils/sizeOrder";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import {
  CATEGORIA_LINEA_CONFIG,
  SIN_LINEA_LABEL,
} from "../../product-categories/constants/categoriaLinea";
import { useProductSearchField, useProductsByIds } from "../hooks/useProductSelector";
import type { ProductSelectorItem } from "../interfaces/product-selector.interface";
import { CATALOG_PRICE_RANGE_OPTIONS, SIN_LINEA_FILTER_VALUE } from "../utils/catalogListParams";

/**
 * Encabezados "título + filtro" de las tablas de catálogo en MODO SERVIDOR
 * (EC-897): productos, variantes y Materiales. Son componentes (no parte de
 * las factorías de columnas) porque las opciones salen de catálogos o son
 * fijas, nunca de las filas: la tabla solo tiene una página. Cada columna
 * declara su clave en `meta.serverFilter`.
 */

interface HeaderProps<TData> {
  column: Column<TData, unknown>;
  title: string;
}

const byLabel = (a: ColumnFilterOption, b: ColumnFilterOption) => a.label.localeCompare(b.label, "es");

/** Precio (`rango_precio`): los rangos fijos, traducidos a `precio_base_*` al pedir. */
export function PriceRangeHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[
        ALL_FILTER_OPTION,
        ...CATALOG_PRICE_RANGE_OPTIONS.map(({ value, label }) => ({ value, label })),
      ]}
      label={title.toLowerCase()}
      menuAlign="end"
    />
  );
}

/** Estado de las variantes (`activo`): activas e inactivas por separado. */
export function ActivoHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[
        ALL_FILTER_OPTION,
        { value: "true", label: "Activas" },
        { value: "false", label: "Inactivas" },
      ]}
      label={title.toLowerCase()}
    />
  );
}

/** Código Proscai de productos (`con_cod_proscai`): "sin" = vacío o solo espacios. */
export function CodProscaiHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[
        ALL_FILTER_OPTION,
        { value: "true", label: "Con código Proscai" },
        { value: "false", label: "Sin código Proscai" },
      ]}
      label={title.toLowerCase()}
    />
  );
}

/**
 * Línea de la categoría (`linea`). "Sin línea (materia prima)" va primero y
 * se envía como `SIN_LINEA`, que el backend resuelve como línea vacía O sin
 * categoría: un producto sin categoría ya no tiene opción aparte. Un producto
 * con categoría inactiva cae en la línea de esa categoría.
 */
export function LineaHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[
        ALL_FILTER_OPTION,
        { value: SIN_LINEA_FILTER_VALUE, label: SIN_LINEA_LABEL },
        ...optionsFromConfig(CATEGORIA_LINEA_CONFIG),
      ]}
      label="línea"
    />
  );
}

/**
 * Categoría de productos (`categoria_producto`), del catálogo de categorías
 * (las activas de la empresa), por nombre.
 */
export function CategoryHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  const { categories, isLoading, isInitialError } = useProductCategories();
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[
        ALL_FILTER_OPTION,
        ...categories
          .map((category) => ({ value: String(category.id), label: category.nombre }))
          .sort(byLabel),
      ]}
      label={title.toLowerCase()}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}

/** Color de las variantes (`color`), del catálogo de colores, por nombre. */
export function ColorHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  const { colors, isLoading, isInitialError } = useColors();
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[
        ALL_FILTER_OPTION,
        ...colors.map((color) => ({ value: String(color.id), label: color.nombre })).sort(byLabel),
      ]}
      label={title.toLowerCase()}
      searchable={{ placeholder: "Buscar color…" }}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}

/** Talla de las variantes (`talla`), del catálogo de tallas, en su orden canónico. */
export function SizeHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  const { sizes, isLoading, isInitialError } = useSizes();
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[
        ALL_FILTER_OPTION,
        ...[...sizes]
          .sort((a, b) => compareSizes(a.nombre, b.nombre))
          .map((size) => ({ value: String(size.id), label: size.nombre })),
      ]}
      label={title.toLowerCase()}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}

/** Etiqueta de un producto en el filtro: nombre y, si lo tiene, su código. */
const productOption = (product: ProductSelectorItem): ColumnFilterOption => ({
  value: String(product.id),
  label: product.codigo ? `${product.nombre} (${product.codigo})` : product.nombre,
});

/**
 * Producto de las variantes (`producto`): el catálogo de productos no cabe en
 * memoria, así que las opciones salen de `producto/selector/` con `q` mientras
 * se teclea (solo con el menú abierto) y el producto elegido se resuelve con
 * `?ids=`, aunque esté inactivo o la búsqueda vigente no lo traiga.
 */
export function ProductServerSearchHeaderFilter<TData>({ column, title }: HeaderProps<TData>) {
  const [isOpen, setIsOpen] = useState(false);
  const { products, setSearch, total, isSearching, hasLoaded, isInitialError } = useProductSearchField(
    {},
    { enabled: isOpen },
  );
  const activeId = parsePositiveId(useColumnServerFilterValue(column));
  const { productsById } = useProductsByIds(activeId === null ? [] : [activeId]);
  const selectedProduct = activeId === null ? undefined : productsById.get(activeId);
  return (
    <ServerSearchHeaderFilter
      column={column}
      title={title}
      label="producto"
      placeholder="Buscar producto…"
      search={{
        setSearch,
        results: products.map(productOption),
        total: isOpen ? total : undefined,
        // También la primera búsqueda al abrir, que aún no tiene nada que pintar.
        isSearching: isOpen && (isSearching || (!hasLoaded && !isInitialError)),
        isError: isInitialError,
      }}
      selected={selectedProduct ? productOption(selectedProduct) : undefined}
      onOpenChange={setIsOpen}
    />
  );
}
