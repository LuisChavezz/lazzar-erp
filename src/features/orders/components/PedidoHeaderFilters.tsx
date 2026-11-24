"use client";

import type { Column } from "@tanstack/react-table";
import {
  ColumnHeaderFilter,
  FilterHeader,
  type ColumnFilterOption,
} from "@/src/components/ColumnHeaderFilter";
import { LockIcon } from "@/src/components/Icons";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { usePedidoFilterOptions } from "../hooks/usePedidosTable";
import type { PedidoFilterOptions } from "../interfaces/pedido-list.interface";
import {
  getPedidoClasificacionLabel,
  PEDIDO_ESTATUS_CONFIG,
} from "../constants/pedidoStatus";
import {
  PEDIDO_ESTATUS_VALUES,
  SIN_CLASIFICACION,
  type PedidoRangeOption,
} from "../utils/pedidoListParams";

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

/**
 * Retención de Mesa de Control (`?retenido=true|false`, nucleo-erp#1352). Va en
 * el encabezado de Folio junto a la confirmación, con su propia clave
 * (`serverFilterKey`), porque la columna ya liga `confirmado`.
 */
export const RETENIDO_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  { value: "true", label: "Retenidos", dotClassName: "bg-orange-500" },
  { value: "false", label: "No retenidos", dotClassName: "bg-slate-400" },
];

/**
 * Encabezado de Folio de Mesa de Control: dos filtros, la confirmación (la
 * clave de la columna, `meta.serverFilter`, con el embudo) y la retención
 * (`retenido`, con un candado, el mismo ícono que la acción Retener).
 */
export function PedidoFolioHeaderFilters<TData>({
  column,
  title,
}: {
  column: PedidoColumn<TData>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{title}</span>
      <ColumnHeaderFilter column={column} options={CONFIRMADO_OPTIONS} label="estado de confirmación" />
      <ColumnHeaderFilter
        column={column}
        serverFilterKey="retenido"
        icon={LockIcon}
        options={RETENIDO_FILTER_OPTIONS}
        label="retención"
      />
    </div>
  );
}

/**
 * "Sin surtir" (`?sin_surtir=true`): programados, no cancelados y sin un solo
 * picking vivo, retenidos incluidos (regla del backend). Solo la opción
 * encendida: `false` sería "todo lo demás", sin programar incluido, que no es
 * lo contrario de lo que se lee.
 */
export const SIN_SURTIR_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  { value: "true", label: "Sin surtir", dotClassName: "bg-amber-500" },
];

export function PedidoSinSurtirHeaderFilter<TData>({
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
      options={SIN_SURTIR_FILTER_OPTIONS}
      label="pedidos sin surtir"
      menuAlign="end"
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

/**
 * «Sin clasificación» (`SIN_CLASIFICACION`), la opción virtual que Mis pedidos
 * fija en primer lugar del filtro de clasificación: `opciones/` no lista las
 * clasificaciones nulas, así que se ofrece siempre. Misma etiqueta que la
 * celda (`getPedidoClasificacionLabel(null)`).
 */
export const SIN_CLASIFICACION_FILTER_OPTION: ColumnFilterOption = {
  value: SIN_CLASIFICACION,
  label: getPedidoClasificacionLabel(null),
};

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
  pinnedOptions = [],
  searchPlaceholder,
  menuAlign,
}: {
  column: PedidoColumn<TData>;
  title: string;
  catalog: keyof PedidoFilterOptions;
  label: string;
  /** El catálogo de "Mis pedidos" (`?mis_pedidos=true`). */
  misPedidos?: boolean;
  /**
   * Opciones fijas antes de las del catálogo (tras "Todos"), visibles aunque
   * el catálogo cargue o falle. Opt-in: sin ellas, las opciones de siempre.
   */
  pinnedOptions?: readonly ColumnFilterOption[];
  /** Con él, el menú lleva buscador (catálogos largos: clientes, vendedores). */
  searchPlaceholder?: string;
  menuAlign?: "start" | "end";
}) {
  const { data, isLoading, isInitialError } = usePedidoFilterOptions(misPedidos);
  const options: ColumnFilterOption[] = [
    ALL_FILTER_OPTION,
    ...pinnedOptions,
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
