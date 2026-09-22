'use client';

import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRightIcon } from '@/src/components/Icons';
import { ColumnHeaderFilter, type ColumnFilterOption } from '@/src/components/ColumnHeaderFilter';
import { formatMoneyValueOrDash } from '@/src/utils/formatCurrency';
import { parseLocalDate } from '@/src/utils/formatDate';
import type { PedidoListItem } from '../interfaces/order.interface';
import { PEDIDO_ESTATUS, PEDIDO_ESTATUS_CONFIG, getPedidoEstatusConfig } from '../constants/pedidoStatus';

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
  onViewDetail: (order: PedidoListItem) => void;
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

/**
 * La OC del pedido, igual que en `SalesOrderColumns.tsx`: varios pedidos
 * traen literalmente "-"/"--" como OC (placeholder del backend, no una OC
 * real), así que se oculta cuando no queda contenido significativo.
 */
function hasMeaningfulOc(oc: string | null): oc is string {
  return Boolean(oc && oc.replace(/-/g, '').trim().length > 0);
}

export function createProcurementOrderColumns({
  onViewDetail,
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
              <button
                type="button"
                onClick={() => onViewDetail(order)}
                className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
                title="Ver detalle del pedido"
              >
                {order.folio || '—'}
                <ChevronRightIcon
                  className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </button>
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
      header: 'Cliente',
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
      header: 'Fecha',
      size: 110,
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
      header: 'Fecha confirmada',
      size: 130,
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
      header: 'Total',
      size: 130,
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {formatMoneyValueOrDash(row.original.gran_total)}
        </span>
      ),
    },
  ];
}
