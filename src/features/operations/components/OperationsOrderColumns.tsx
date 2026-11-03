"use client";

import { type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import {
  ColumnHeaderFilter,
  FilterHeader,
  type ColumnFilterOption,
} from "@/src/components/ColumnHeaderFilter";
import {
  ALL_FILTER_OPTION,
  buildDistinctFilterOptions,
  buildMonthFilterOptions,
  matchesMonthFilter,
  matchesRangeFilter,
  type RangeFilterOption,
} from "@/src/utils/columnFilterOptions";
import {
  BanIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  EditIcon,
  EyeIcon,
} from "@/src/components/Icons";
import { formatOrderAmountOrDash } from "@/src/features/orders/utils/orderAmountFormat";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import {
  canEditPedidoMesaControl,
  getPedidoClasificacionLabel,
  getTipoPedidoConfig,
  PEDIDO_ESTATUS,
  TIPO_PEDIDO,
} from "@/src/features/orders/constants/pedidoStatus";
import { isOrderConfirmed } from "@/src/features/orders/components/SharedOrderColumns";
import { formatFolioCorto, hasMeaningfulOc } from "@/src/features/orders/utils/pedidoFormat";
import { getProgramacionesValidas } from "@/src/features/orders/utils/pedidoProgramacion";
import { pedidoDetailHref, pedidoDetailPath } from "@/src/features/orders/constants/pedidoDetailOrigins";

export { isOrderConfirmed };

/**
 * Columnas de Pedidos en Mesa de Control. NO reusa `createOrderColumns` de
 * `SharedOrderColumns.tsx` a propósito: ese archivo sigue sirviendo a Almacén
 * y Compras sin cambios (columnas Estado/Acciones separadas). Aquí, siguiendo
 * el mismo patrón que `SalesOrderColumns.tsx`, el folio funciona como trigger
 * del menú completo de acciones y lleva el punto de color de confirmación —
 * sin columnas aparte de "Estado"/"Acciones".
 */
export interface OperationsOrderColumnCallbacks {
  onProgramar: (order: PedidoListItem) => void;
  onCancel: (order: PedidoListItem) => void;
}

const CONFIRMATION_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "por_confirmar", label: "Por confirmar", dotClassName: "bg-amber-500" },
  { value: "confirmado", label: "Confirmado", dotClassName: "bg-cyan-500" },
];

// ─── Filtros de encabezado de las demás columnas ──────────────────────────────
// La lista completa vive en memoria: las opciones de cliente, vendedor, mes y
// clasificación salen de sus filas; piezas e importe usan rangos fijos. El
// importe va sin símbolo, igual que la celda (la fila solo trae el id de
// moneda, ver `orderAmountFormat.ts`).

export interface OperationsOrderFilterOptions {
  clientes: ColumnFilterOption[];
  vendedores: ColumnFilterOption[];
  meses: ColumnFilterOption[];
  clasificaciones: ColumnFilterOption[];
}

export function buildOperationsOrderFilterOptions(
  orders: PedidoListItem[],
): OperationsOrderFilterOptions {
  return {
    clientes: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(orders, (o) => o.cliente, (o) => o.cliente_razon_social),
    ],
    vendedores: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(orders, (o) => o.vendedor_nombre),
    ],
    meses: [ALL_FILTER_OPTION, ...buildMonthFilterOptions(orders.map((o) => o.created_at))],
    clasificaciones: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(
        orders,
        (o) => o.clasificacion,
        (o) => getPedidoClasificacionLabel(o.clasificacion),
      ),
    ],
  };
}

const PIEZAS_RANGES: RangeFilterOption[] = [
  { value: "1-50", label: "1 a 50 piezas", max: 51 },
  { value: "51-500", label: "51 a 500 piezas", min: 51, max: 501 },
  { value: "mas-500", label: "Más de 500 piezas", min: 501 },
];

const IMPORTE_RANGES: RangeFilterOption[] = [
  { value: "hasta-10k", label: "Hasta 10,000", max: 10_000 },
  { value: "10k-100k", label: "10,000 – 100,000", min: 10_000, max: 100_000 },
  { value: "mas-100k", label: "Más de 100,000", min: 100_000 },
];

const rangeOptions = (ranges: RangeFilterOption[]): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  ...ranges.map(({ value, label }) => ({ value, label })),
];

const EMPTY_FILTER_OPTIONS: OperationsOrderFilterOptions = {
  clientes: [ALL_FILTER_OPTION],
  vendedores: [ALL_FILTER_OPTION],
  meses: [ALL_FILTER_OPTION],
  clasificaciones: [ALL_FILTER_OPTION],
};

/**
 * Piezas ya programadas: suma de `cantidad` de las parcialidades guardadas en
 * `programacion_conf` (lo mismo que lista "Pedidos programados"). `null` si el
 * pedido no tiene programación. Se compara contra `piezas_programables`, no
 * contra `piezas`: es el total que el backend permite programar.
 */
export const getPiezasProgramadas = (order: Pick<PedidoListItem, "programacion_conf">) => {
  const programaciones = getProgramacionesValidas(order.programacion_conf);
  if (!programaciones.length) return null;
  return programaciones.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
};

/**
 * "X de Y" con una barra delgada: verde al completar, azul en curso. Sin
 * `piezas_programables` (backend anterior) solo pinta lo programado; un pedido
 * sin piezas programables no tiene nada que programar.
 */
/**
 * Piezas surtidas por WMS contra las piezas del pedido: "X de Y" con barra
 * (verde al completar). "—" mientras el backend no mande `piezas_surtidas`.
 */
const SurtidoCell = ({ order }: { order: PedidoListItem }) => {
  const surtidas = order.piezas_surtidas;
  const total = order.piezas;
  if (surtidas === undefined || total <= 0) {
    return <span className="text-sm text-slate-400 dark:text-slate-600">—</span>;
  }
  const pct = Math.min(100, Math.round((surtidas / total) * 100));
  const completo = pct >= 100;
  return (
    <div className="inline-flex flex-col items-end gap-1" title={`${pct}% surtido`}>
      <span className="tabular-nums text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
        <span
          className={`font-semibold ${
            surtidas === 0
              ? "text-slate-400 dark:text-slate-500"
              : completo
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-800 dark:text-white"
          }`}
        >
          {surtidas.toLocaleString("es-MX")}
        </span>{" "}
        de {total.toLocaleString("es-MX")}
      </span>
      <span
        className="h-1 w-16 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Piezas surtidas"
      >
        <span
          className={`block h-full rounded-full ${completo ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
};

const ProgramadoCell = ({ order }: { order: PedidoListItem }) => {
  const programadas = getPiezasProgramadas(order) ?? 0;
  const parcialidades = getProgramacionesValidas(order.programacion_conf).length;
  const total = order.piezas_programables;

  if (total === 0 && programadas === 0) {
    return <span className="text-sm text-slate-400 dark:text-slate-600">—</span>;
  }
  if (total === undefined) {
    return programadas === 0 ? (
      <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
    ) : (
      <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
        {programadas.toLocaleString("es-MX")}
      </span>
    );
  }

  const pct = total > 0 ? Math.min(100, Math.round((programadas / total) * 100)) : 0;
  const completo = pct >= 100;
  return (
    <div
      className="inline-flex flex-col items-end gap-1"
      title={`${parcialidades} ${parcialidades === 1 ? "parcialidad" : "parcialidades"} · ${pct}%`}
    >
      <span className="tabular-nums text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
        <span
          className={`font-semibold ${
            programadas === 0
              ? "text-slate-400 dark:text-slate-500"
              : completo
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-800 dark:text-white"
          }`}
        >
          {programadas.toLocaleString("es-MX")}
        </span>{" "}
        de {total.toLocaleString("es-MX")}
      </span>
      <span
        className="h-1 w-16 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Piezas programadas"
      >
        <span
          className={`block h-full rounded-full ${completo ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
};

/**
 * "Solo muestras" si todas sus piezas son de muestra, "Con muestras" si solo
 * algunas; `null` sin muestras o sin el dato (`piezas_muestra`).
 */
export const getMuestrasLabel = (
  order: Pick<PedidoListItem, "piezas" | "piezas_muestra">,
): string | null => {
  const muestras = order.piezas_muestra ?? 0;
  if (muestras <= 0) return null;
  return muestras >= order.piezas ? "Solo muestras" : "Con muestras";
};

const MUESTRA_BADGE_CLASS = getTipoPedidoConfig(TIPO_PEDIDO.MUESTRA).className;

/**
 * Opciones de muestras dentro del filtro de Piezas (un solo embudo): "con" es
 * lo mismo que `?con_muestras=true` del backend; aquí se filtra en memoria.
 */
const MUESTRAS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: "muestras-con", label: "Con muestras", dotClassName: "bg-violet-500" },
  { value: "muestras-solo", label: "Solo muestras", dotClassName: "bg-violet-500" },
  { value: "muestras-sin", label: "Sin muestras", dotClassName: "bg-slate-400" },
];

/** `null` si `filterValue` no es una opción de muestras (es un rango). */
const matchesMuestrasFilter = (order: PedidoListItem, filterValue: string): boolean | null => {
  const label = getMuestrasLabel(order);
  if (filterValue === "muestras-con") return label !== null;
  if (filterValue === "muestras-solo") return label === "Solo muestras";
  if (filterValue === "muestras-sin") return label === null;
  return null;
};

const confirmationFilterFn: FilterFn<PedidoListItem> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  const confirmed = isOrderConfirmed(row.original);
  return filterValue === "confirmado" ? confirmed : !confirmed;
};

const FolioCell = ({
  order,
  onProgramar,
  onCancel,
}: {
  order: PedidoListItem;
} & OperationsOrderColumnCallbacks) => {
  const confirmed = isOrderConfirmed(order);
  const muestrasLabel = getMuestrasLabel(order);

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalle",
      icon: EyeIcon,
      // Enlace real (`href`) al detalle 360°: Next lo prefetchea y clic
      // medio/Ctrl+clic abren otra pestaña. `from=operations` hace que el
      // "Volver" regrese a esta Mesa de Control.
      href: pedidoDetailHref(order.id, "operations"),
    },
    // Tallas con stock y faltante + parcialidades: sustituye también al antiguo
    // "Revisar inventario".
    {
      label: "Programar",
      icon: CalendarDaysIcon,
      onSelect: () => onProgramar(order),
      permission: "E-MESACONTROL-PEDIDOS",
      visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO,
    },
    // La fecha de confirmación se edita en la cabecera del detalle del pedido.
    {
      // Edición del pedido con sincronización a su cotización de origen. Enlace
      // real, como "Ver detalle": prefetch y clic medio/Ctrl+clic.
      label: "Editar",
      icon: EditIcon,
      href: `${pedidoDetailPath(order.id)}/edit-mesa-control`,
      permission: "E-MESACONTROL-PEDIDOS",
      visible: canEditPedidoMesaControl(order.estatus),
      tone: "warning",
    },
    // Un CANCELADO legado (`activo = true`, de antes de `/cancelar/`) sigue
    // listándose, pero no hay nada que cancelar.
    {
      label: "Cancelar pedido",
      icon: BanIcon,
      onSelect: () => onCancel(order),
      permission: "E-MESACONTROL-PEDIDOS",
      visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO,
      tone: "danger",
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${confirmed ? "bg-cyan-500" : "bg-amber-500"}`}
        aria-hidden="true"
      />
      {/* Folio arriba; debajo, la confirmación EN PALABRA (badge discreto,
          como Compras) y la OC. */}
      <div className="flex flex-col items-start gap-1 min-w-0">
      <ActionMenu
        items={items}
        ariaLabel={`Acciones del pedido ${order.folio}`}
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones del pedido ${order.folio}`}
            title="Ver detalle"
            className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span title={order.folio || undefined}>{formatFolioCorto(order.folio) || "—"}</span>
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
      <div className="flex items-center gap-1 min-w-0">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${
            confirmed
              ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          }`}
        >
          {confirmed ? "Confirmado" : "Por confirmar"}
        </span>
        {muestrasLabel && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${MUESTRA_BADGE_CLASS}`}
            title={`${order.piezas_muestra} de ${order.piezas} piezas son muestra`}
          >
            {muestrasLabel}
          </span>
        )}
        {hasMeaningfulOc(order.oc) && (
          <span
            className="inline-flex max-w-32 items-center truncate px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
            title={`Orden de compra: ${order.oc}`}
          >
            OC {order.oc}
          </span>
        )}
      </div>
      </div>
    </div>
  );
};

export function buildOperationsOrderColumns(
  callbacks: OperationsOrderColumnCallbacks,
  filterOptions: OperationsOrderFilterOptions = EMPTY_FILTER_OPTIONS,
): ColumnDef<PedidoListItem, unknown>[] {
  return [
    {
      id: "folio",
      accessorKey: "folio",
      filterFn: confirmationFilterFn,
      // Punto + folio (`P-00000-2026` en mono) + chevron miden ~124px; con el
      // ancho por defecto (150px, 118 útiles) la celda se partía en dos
      // líneas y el punto quedaba encima del folio. Mismo ancho que el folio
      // de `SalesOrderColumns.tsx`.
      size: 190,
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Folio</span>
          <ColumnHeaderFilter
            column={column}
            options={CONFIRMATION_FILTER_OPTIONS}
            label="estado de confirmación"
          />
        </div>
      ),
      cell: ({ row }) => <FolioCell order={row.original} {...callbacks} />,
    },
    {
      id: "razon_social",
      accessorKey: "cliente_razon_social",
      size: 240,
      meta: { label: "Razón social" },
      header: ({ column }) => (
        <FilterHeader
          title="Razón social"
          column={column}
          options={filterOptions.clientes}
          label="razón social"
          searchable={{ placeholder: "Buscar cliente…" }}
        />
      ),
      // Por id de cliente: dos razones sociales iguales no se mezclan.
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || String(row.original.cliente) === filterValue,
      cell: ({ row }) => (
        <span
          className="block text-sm text-slate-600 dark:text-slate-300 truncate"
          title={row.original.cliente_razon_social ?? undefined}
        >
          {row.original.cliente_razon_social || "—"}
        </span>
      ),
    },
    {
      // Todas las tallas, muestras incluidas (EC-571).
      id: "piezas",
      accessorKey: "piezas",
      header: ({ column }) => (
        <FilterHeader
          title="Piezas"
          column={column}
          options={[...rangeOptions(PIEZAS_RANGES), ...MUESTRAS_FILTER_OPTIONS]}
          label="piezas o muestras"
        />
      ),
      meta: { align: "right", label: "Piezas" },
      filterFn: (row, _columnId, filterValue) =>
        (filterValue && matchesMuestrasFilter(row.original, filterValue)) ??
        matchesRangeFilter(PIEZAS_RANGES, row.original.piezas, filterValue),
      sortingFn: "basic",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300">
          {row.original.piezas}
        </span>
      ),
    },
    {
      // Piezas ya programadas por Mesa de Control; "—" si aún no se programa.
      id: "programado",
      accessorFn: (order) => getPiezasProgramadas(order) ?? undefined,
      header: "Programado",
      meta: { align: "right", label: "Programado" },
      sortUndefined: "last",
      enableGlobalFilter: false,
      size: 150,
      cell: ({ row }) => <ProgramadoCell order={row.original} />,
    },
    {
      // Piezas surtidas por WMS (pickings); "—" hasta que el backend lo mande.
      id: "surtido",
      accessorFn: (order) => order.piezas_surtidas,
      header: "Surtido",
      meta: { align: "right", label: "Surtido" },
      sortUndefined: "last",
      enableGlobalFilter: false,
      size: 150,
      cell: ({ row }) => <SurtidoCell order={row.original} />,
    },
    {
      // Vendedor de la cotización de origen; `null` sin cotización (EC-571).
      id: "vendedor",
      // Vacío → `undefined` para que `sortUndefined: "last"` lo deje al final.
      accessorFn: (order) => order.vendedor_nombre || undefined,
      meta: { label: "Vendedor" },
      header: ({ column }) => (
        <FilterHeader
          title="Vendedor"
          column={column}
          options={filterOptions.vendedores}
          label="vendedor"
          searchable={{ placeholder: "Buscar vendedor…" }}
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || row.original.vendedor_nombre === filterValue,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="block text-sm text-slate-600 dark:text-slate-300 truncate max-w-45">
          {row.original.vendedor_nombre || "—"}
        </span>
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      meta: { label: "Fecha" },
      header: ({ column }) => (
        <FilterHeader title="Fecha" column={column} options={filterOptions.meses} label="mes" />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesMonthFilter(row.original.created_at, filterValue),
      cell: ({ row }) => {
        const createdAt = row.original.created_at;
        return (
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {createdAt ? format(new Date(createdAt), "d MMM yyyy", { locale: es }) : "—"}
          </span>
        );
      },
    },
    {
      // Misma etiqueta que el detalle del pedido y que Programación
      // (`getPedidoClasificacionLabel`). Ordena por código; sin clasificación, al final.
      id: "clasificacion",
      accessorFn: (order) => order.clasificacion || undefined,
      meta: { label: "Clasificación" },
      header: ({ column }) => (
        <FilterHeader
          title="Clasificación"
          column={column}
          options={filterOptions.clasificaciones}
          label="clasificación"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || row.original.clasificacion === filterValue,
      // Etiqueta más larga: "X - Solo para facturar", igual que en Programación.
      size: 180,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      ),
    },
    {
      id: "importe_sin_iva",
      accessorKey: "subtotal",
      header: ({ column }) => (
        <FilterHeader
          title="Importe sin IVA"
          column={column}
          options={rangeOptions(IMPORTE_RANGES)}
          label="rango de importe"
          menuAlign="end"
        />
      ),
      meta: { align: "right", label: "Importe sin IVA" },
      filterFn: (row, _columnId, filterValue) =>
        matchesRangeFilter(IMPORTE_RANGES, row.original.subtotal, filterValue),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.subtotal)}
        </span>
      ),
    },
    {
      // PLACEHOLDER: `PedidoListItem` no expone código postal.
      id: "cp",
      header: "C.P.",
      enableSorting: false,
      cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
    },
  ];
}
