"use client";

import type { Column } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { usePedidoFilterOptions } from "../hooks/usePedidosTable";
import type { PedidoFilterOptions } from "../interfaces/pedido-list.interface";
import {
  getPedidoClasificacionLabel,
  PEDIDO_ESTATUS_CONFIG,
} from "../constants/pedidoStatus";
import { PEDIDO_ESTATUS_VALUES, type PedidoRangeOption } from "../utils/pedidoListParams";

/**
 * Encabezados con filtro de las listas de pedidos en MODO SERVIDOR (Mesa de
 * Control, Compras › Pedidos, Mis pedidos). Cada columna declara la clave en
 * `meta.serverFilter`; aquí solo se pintan las opciones. Son FIJAS o salen del
 * catálogo `opciones/` del backend (todo el conjunto visible), nunca de las
 * filas: la tabla solo tiene la página actual.
 */

type PedidoColumn<TData> = Column<TData, unknown>;

/** Confirmación según `fecha_confirmacion` (`?confirmado=`), con el punto de la celda. */
const CONFIRMADO_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  { value: "false", label: "Por confirmar", dotClassName: "bg-amber-500" },
  { value: "true", label: "Confirmado", dotClassName: "bg-cyan-500" },
];

export function PedidoConfirmadoHeaderFilter<TData>({
  column,
  title,
}: {
  column: PedidoColumn<TData>;
  title: string;
}) {
  return (
    <FilterHeader
      title={title}
      column={column}
      options={CONFIRMADO_OPTIONS}
      label="estado de confirmación"
    />
  );
}

/** Ciclo de vida del pedido (`?estatus=`), con su punto de color. */
const ESTATUS_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PEDIDO_ESTATUS_VALUES.map((estatus) => {
    const config = PEDIDO_ESTATUS_CONFIG[Number(estatus)];
    return { value: estatus, label: config?.label ?? estatus, dotClassName: config?.dot };
  }),
];

export function PedidoEstatusHeaderFilter<TData>({
  column,
  title,
}: {
  column: PedidoColumn<TData>;
  title: string;
}) {
  return (
    <FilterHeader title={title} column={column} options={ESTATUS_OPTIONS} label="estatus del pedido" />
  );
}

/** Un rango fijo (`rango_*`, ver `pedidoListParams.ts`). */
export function PedidoRangeHeaderFilter<TData>({
  column,
  title,
  label,
  options,
  menuAlign,
}: {
  column: PedidoColumn<TData>;
  title: string;
  label: string;
  options: readonly PedidoRangeOption[];
  menuAlign?: "start" | "end";
}) {
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[ALL_FILTER_OPTION, ...options.map(({ value, label }) => ({ value, label }))]}
      label={label}
      menuAlign={menuAlign}
    />
  );
}

/** Etiqueta de cada catálogo; la clasificación usa la misma que la celda. */
const catalogLabel = (catalog: keyof PedidoFilterOptions, value: string, label: string) =>
  catalog === "clasificacion" ? getPedidoClasificacionLabel(value) : label;

/**
 * Filtro cuyas opciones salen de `opciones/` (`cliente`, `vendedor`, `mes`,
 * `mes_confirmacion`, `clasificacion`). El valor es el que espera el filtro del
 * mismo nombre: el id del cliente o del vendedor, "AAAA-MM", el código.
 */
export function PedidoCatalogHeaderFilter<TData>({
  column,
  title,
  catalog,
  label,
  misPedidos = false,
  searchPlaceholder,
  menuAlign,
}: {
  column: PedidoColumn<TData>;
  title: string;
  catalog: keyof PedidoFilterOptions;
  label: string;
  /** El catálogo de "Mis pedidos" (`?mis_pedidos=true`). */
  misPedidos?: boolean;
  /** Con él, el menú lleva buscador (catálogos largos: clientes, vendedores). */
  searchPlaceholder?: string;
  menuAlign?: "start" | "end";
}) {
  const { data, isLoading, isInitialError } = usePedidoFilterOptions(misPedidos);
  const options: ColumnFilterOption[] = [
    ALL_FILTER_OPTION,
    ...(data?.[catalog] ?? []).map((option) => ({
      value: String(option.value),
      label: catalogLabel(catalog, String(option.value), option.label),
    })),
  ];
  return (
    <FilterHeader
      title={title}
      column={column}
      options={options}
      label={label}
      searchable={searchPlaceholder ? { placeholder: searchPlaceholder } : undefined}
      isLoading={isLoading}
      isError={isInitialError}
      menuAlign={menuAlign}
    />
  );
}
