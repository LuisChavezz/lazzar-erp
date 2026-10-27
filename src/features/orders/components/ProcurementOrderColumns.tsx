'use client';

import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRightIcon } from '@/src/components/Icons';
import { ColumnHeaderFilter, type ColumnFilterOption } from '@/src/components/ColumnHeaderFilter';
import { formatOrderAmountOrDash } from '../utils/orderAmountFormat';
import { parseLocalDate } from '@/src/utils/formatDate';
import {
  buildMonthFilterOptions,
  matchesMonthFilter,
  matchesRangeFilter,
  type RangeFilterOption,
} from '@/src/utils/columnFilterOptions';
import type { PedidoListItem } from '../interfaces/order.interface';
import { PEDIDO_ESTATUS, PEDIDO_ESTATUS_CONFIG, getPedidoEstatusConfig } from '../constants/pedidoStatus';
import { hasMeaningfulOc } from '../utils/pedidoFormat';
import type { PedidoDetailOrigin } from '../constants/pedidoDetailOrigins';
import { PedidoFolioLink } from './PedidoFolioLink';

/**
 * Columnas de "Pedidos" vistos desde Compras/SCM (`GET /ventas/pedidos/`,
 * `OrderListView` con `variant="procurement"`). Mismo estándar visual que
 * `PurchaseOrderColumns.tsx` (folio como elemento principal con su estatus
 * reducido a un punto de color, referencia secundaria como mini-pill, sin
 * columna de Acciones cuando no hay más acción que "ver detalle" — el folio
 * ya navega) y el mismo patrón de filtro de encabezado que
 * `SalesOrderColumns.tsx` (`ColumnHeaderFilter`, estado NATIVO de columna de
 * TanStack).
 *
 * NO reusa `createOrderColumns` de `SharedOrderColumns.tsx` a propósito:
 * aquella sigue sirviendo a Mesa de Control (que añade Confirmar
 * fecha/Editar/Programar) y a WMS sin tocarlos — mismo criterio por el que
 * `SalesOrderColumns.tsx` ya vive aparte.
 *
 * A diferencia de Ventas, aquí el estatus filtrado es el CICLO DE VIDA del
 * pedido (`PEDIDO_ESTATUS`: Borrador/Por autorizar/Autorizada/En
 * proceso/Cancelado) y no la confirmación de fecha — es lo que de verdad le
 * importa a Compras para planear abastecimiento: un pedido cancelado no debe
 * planearse.
 */
export interface ProcurementOrderColumnsOptions {
  /** Llave `?from=` del detalle 360° que abre el folio. */
  from: PedidoDetailOrigin;
  /**
   * Opciones de los filtros de Cliente, Fecha y Fecha confirmada, que salen de
   * la lista completa (`buildProcurementOrderFilterOptions`): la tabla es de
   * modo cliente y tiene todos los pedidos en memoria.
   */
  filterOptions: ProcurementOrderFilterOptions;
}

export interface ProcurementOrderFilterOptions {
  clientes: ColumnFilterOption[];
  fechas: ColumnFilterOption[];
  fechasConfirmacion: ColumnFilterOption[];
}

const ALL_OPTION: ColumnFilterOption = { value: undefined, label: 'Todos' };

/**
 * Opciones de los filtros de encabezado que dependen de los datos: un cliente
 * por id (dos razones sociales iguales no se mezclan) y un mes por cada mes
 * presente en las fechas.
 */
export function buildProcurementOrderFilterOptions(
  orders: PedidoListItem[],
): ProcurementOrderFilterOptions {
  const clientes = new Map<number, string>();
  for (const order of orders) {
    const nombre = order.cliente_razon_social || order.cliente_nombre;
    if (nombre && !clientes.has(order.cliente)) clientes.set(order.cliente, nombre);
  }
  return {
    clientes: [
      ALL_OPTION,
      ...Array.from(clientes.entries())
        .sort(([, a], [, b]) => a.localeCompare(b))
        .map(([id, nombre]) => ({ value: String(id), label: nombre })),
    ],
    fechas: [ALL_OPTION, ...buildMonthFilterOptions(orders.map((order) => order.created_at))],
    fechasConfirmacion: [
      ALL_OPTION,
      ...buildMonthFilterOptions(
        orders.map((order) => order.fecha_confirmacion),
        'Sin confirmar',
      ),
    ],
  };
}

/**
 * Rangos del filtro de Total. Sin símbolo de moneda, igual que la celda: la
 * fila solo trae el id de `moneda` (ver `orderAmountFormat.ts`).
 */
const TOTAL_RANGES: RangeFilterOption[] = [
  { value: 'cero', label: 'Sin importe (0.00)', max: 0.005 },
  { value: 'hasta-10k', label: 'Hasta 10,000', min: 0.005, max: 10_000 },
  { value: '10k-100k', label: '10,000 – 100,000', min: 10_000, max: 100_000 },
  { value: 'mas-100k', label: 'Más de 100,000', min: 100_000 },
];

const TOTAL_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_OPTION,
  ...TOTAL_RANGES.map(({ value, label }) => ({ value, label })),
];

/** Encabezado con su filtro, para no repetir el mismo marcado en cada columna. */
function FilterHeader({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{title}</span>
      {children}
    </div>
  );
}

/** Punto de color por estatus — deriva de los mismos colores que ya usa `PEDIDO_ESTATUS_CONFIG.className`. */
const ESTATUS_DOT: Record<number, string> = {
  [PEDIDO_ESTATUS.BORRADOR]: 'bg-slate-400',
  [PEDIDO_ESTATUS.POR_AUTORIZAR]: 'bg-amber-500',
  [PEDIDO_ESTATUS.AUTORIZADA]: 'bg-emerald-500',
  [PEDIDO_ESTATUS.EN_PROCESO]: 'bg-sky-500',
  [PEDIDO_ESTATUS.CANCELADO]: 'bg-rose-500',
};

const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: 'Todos' },
  ...Object.entries(PEDIDO_ESTATUS_CONFIG).map(([id, cfg]) => ({
    value: id,
    label: cfg.label,
    dotClassName: ESTATUS_DOT[Number(id)],
  })),
];

/** Filtro EXACTO sobre `row.original.estatus` — el valor crudo, no la etiqueta traducida. */
const estatusFilterFn: FilterFn<PedidoListItem> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  return String(row.original.estatus) === filterValue;
};

export function createProcurementOrderColumns({
  from,
  filterOptions,
}: ProcurementOrderColumnsOptions): ColumnDef<PedidoListItem, unknown>[] {
  return [
    {
      id: 'folio',
      accessorKey: 'folio',
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Folio</span>
          <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus del pedido" />
        </div>
      ),
      filterFn: estatusFilterFn,
      size: 190,
      cell: ({ row }) => {
        const order = row.original;
        const cfg = getPedidoEstatusConfig(order.estatus);
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${ESTATUS_DOT[order.estatus] ?? 'bg-slate-400'}`}
              title={cfg.label}
              aria-hidden="true"
            />
            <span className="sr-only">{cfg.label}</span>
            <div className="flex flex-col items-start gap-1 min-w-0">
              <PedidoFolioLink
                pedidoId={order.id}
                folio={order.folio}
                from={from}
                className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white"
              >
                <ChevronRightIcon
                  className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </PedidoFolioLink>
              {hasMeaningfulOc(order.oc) && (
                <span
                  className="inline-flex max-w-32 items-center truncate px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  title={`Orden de compra: ${order.oc}`}
                >
                  {order.oc}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'cliente',
      accessorKey: 'cliente_razon_social',
      meta: { label: 'Cliente' },
      header: ({ column }) => (
        <FilterHeader title="Cliente">
          <ColumnHeaderFilter
            column={column}
            options={filterOptions.clientes}
            label="cliente"
            searchable={{ placeholder: 'Buscar cliente…' }}
          />
        </FilterHeader>
      ),
      // Por id de cliente, no por el nombre que se muestra.
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || String(row.original.cliente) === filterValue,
      size: 220,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="min-w-0">
            <p
              className="text-[13px] font-medium text-slate-800 dark:text-white truncate max-w-55"
              title={order.cliente_razon_social ?? undefined}
            >
              {order.cliente_razon_social || '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-55">
              {order.cliente_nombre || '—'}
            </p>
          </div>
        );
      },
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { label: 'Fecha' },
      header: ({ column }) => (
        <FilterHeader title="Fecha">
          <ColumnHeaderFilter column={column} options={filterOptions.fechas} label="mes" />
        </FilterHeader>
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesMonthFilter(row.original.created_at, filterValue),
      size: 120,
      cell: ({ row }) => {
        const createdAt = row.original.created_at;
        return (
          <span className="text-[13px] text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
            {createdAt ? format(new Date(createdAt), 'd MMM yyyy', { locale: es }) : '—'}
          </span>
        );
      },
    },
    // `accessorFn` que colapsa `null` a `''` — mismo motivo que documenta
    // `SharedOrderColumns.tsx`: los pedidos por confirmar por definición no
    // tienen `fecha_confirmacion`, y dejarlo en `undefined` en la primera
    // fila sacaría la columna de la búsqueda global.
    {
      id: 'fecha_confirmacion',
      accessorFn: (order) => order.fecha_confirmacion ?? '',
      meta: { label: 'Fecha confirmada' },
      header: ({ column }) => (
        <FilterHeader title="Fecha confirmada">
          <ColumnHeaderFilter
            column={column}
            options={filterOptions.fechasConfirmacion}
            label="mes de confirmación"
          />
        </FilterHeader>
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesMonthFilter(row.original.fecha_confirmacion, filterValue),
      size: 160,
      cell: ({ row }) => {
        const parsedDate = parseLocalDate(row.original.fecha_confirmacion);
        return (
          <span className="text-[13px] text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
            {parsedDate ? format(parsedDate, 'd MMM yyyy', { locale: es }) : '—'}
          </span>
        );
      },
    },
    {
      id: 'gran_total',
      accessorKey: 'gran_total',
      header: ({ column }) => (
        <FilterHeader title="Total">
          <ColumnHeaderFilter
            column={column}
            options={TOTAL_FILTER_OPTIONS}
            label="rango de total"
            menuAlign="end"
          />
        </FilterHeader>
      ),
      meta: { align: "right", label: 'Total' },
      filterFn: (row, _columnId, filterValue) =>
        matchesRangeFilter(TOTAL_RANGES, row.original.gran_total, filterValue),
      size: 130,
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.gran_total)}
        </span>
      ),
    },
  ];
}
