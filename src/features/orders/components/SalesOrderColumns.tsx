'use client';

import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRightIcon } from '@/src/components/Icons';
import { ColumnHeaderFilter } from '@/src/components/ColumnHeaderFilter';
import { formatMoneyValueOrDash } from '@/src/utils/formatCurrency';
import type { PedidoListItem } from '../interfaces/order.interface';
import { isOrderConfirmed } from './SharedOrderColumns';

/**
 * Columnas de "Mis pedidos" (Ventas, `GET /ventas/pedidos/`). NO reusa
 * `createOrderColumns` de `SharedOrderColumns.tsx` a propósito: este layout
 * diverge (folio con punto de confirmación en vez de columna Estado, sin
 * Fecha confirmada ni Acciones, otro orden y set de columnas) mientras que
 * Compras, WMS y Mesa de Control siguen usando la tabla compartida sin
 * cambios — ver `OrderListView` (`variant`).
 *
 * El filtro de estado vive AQUÍ, en el propio encabezado de Folio
 * (`ColumnHeaderFilter`), en vez del panel genérico de chips de `DataTable`
 * (`filterConfig`) — `OrderListView` ya no le pasa `filterConfig` en esta
 * variante. Usa el estado NATIVO de columna de TanStack
 * (`column.getFilterValue`/`setFilterValue`), habilitado en `DataTable.tsx`
 * vía `columnFilters`; no depende de nada que `DataTable` tenga que
 * exponerle aparte.
 *
 * Piezas / Vendedor / Clasificación / C.P. son PLACEHOLDER a propósito,
 * pedidos explícitamente para previsualizar el layout final: `PedidoListItem`
 * (listado) no expone esos campos — solo el detalle los trae en parte
 * (`PedidoTrackerPicking.total_prendas_pedido`, `Order.clasificacion`,
 * `Order.codigo_postal`; "Vendedor" ni siquiera existe como campo propio hoy,
 * ver `order.interface.ts`). Su celda (`PendingDataCell`) no lee ningún dato
 * — es fija en TODAS las filas hasta que el backend sume esos campos al
 * listado. Ese día, reemplazar `PendingDataCell` por un `cell` normal con
 * `accessorKey`/`accessorFn` en cada una: traerlos por fila con un fetch de
 * detalle aparte (N+1) no vale la pena solo por estas columnas. Todas llevan
 * `meta: { hideOnMobile: true }` para no competir por espacio en pantallas
 * angostas mientras no tengan dato real.
 *
 * "Importe sin IVA" SÍ es dato real: `PedidoListItem.subtotal` — a
 * diferencia de `Order`, en el listado nunca es opcional (no pasa por el
 * filtro contable), así que no hace falta el fallback `?? undefined`.
 */
export interface SalesOrderColumnsOptions {
  onViewDetail: (order: PedidoListItem) => void;
}

function PendingDataCell() {
  return <span className="text-[13px] text-slate-300 dark:text-slate-600">—</span>;
}

/**
 * La OC vuelve a la celda de folio, pero sutil (texto, no badge con borde) y
 * solo cuando aporta algo: varios pedidos traen literalmente `"-"` como OC
 * (placeholder del backend, no una OC real) — de ahí salía el recuadro vacío
 * que se veía en la tabla anterior. Se oculta cuando, quitando guiones, no
 * queda ningún caracter (p. ej. `"-"`, `"--"`), y se muestra tal cual cuando
 * sí trae contenido (p. ej. `"-AS"`).
 */
function hasMeaningfulOc(oc: string | null): oc is string {
  return Boolean(oc && oc.replace(/-/g, '').trim().length > 0);
}

const CONFIRMATION_FILTER_OPTIONS = [
  { value: undefined, label: 'Todos' },
  { value: 'por_confirmar', label: 'Por confirmar', dotClassName: 'bg-amber-500' },
  { value: 'confirmado', label: 'Confirmado', dotClassName: 'bg-cyan-500' },
];

/**
 * `filterFn` del propio TanStack ignora el valor accedido de la columna
 * (`folio`) y evalúa directamente `row.original`: el estado de confirmación
 * es un campo DERIVADO (`isOrderConfirmed`), no algo que la columna Folio
 * exponga como su propio valor.
 */
const confirmationFilterFn: FilterFn<PedidoListItem> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  const confirmed = isOrderConfirmed(row.original);
  return filterValue === 'confirmado' ? confirmed : !confirmed;
};

export function createSalesOrderColumns({
  onViewDetail,
}: SalesOrderColumnsOptions): ColumnDef<PedidoListItem, unknown>[] {
  return [
    {
      id: 'folio',
      accessorKey: 'folio',
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
      filterFn: confirmationFilterFn,
      size: 190,
      cell: ({ row }) => {
        const order = row.original;
        const confirmed = isOrderConfirmed(order);
        return (
          // `justify-center`: la celda es un contenedor flex, así que el
          // `text-center` que `DataTable` pone en el `<td>` (modo panel) no
          // la centra por sí solo. El resto de columnas no lleva clase de
          // alineación — la resuelve `DataTable`.
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                confirmed ? 'bg-cyan-500' : 'bg-amber-500'
              }`}
              role="img"
              aria-label={confirmed ? 'Confirmado' : 'Por confirmar'}
              title={confirmed ? 'Confirmado' : 'Por confirmar'}
            />
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
                className="text-[11px] text-slate-400 dark:text-slate-500 font-mono"
                title={`Orden de compra: ${order.oc}`}
              >
                OC {order.oc}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'cliente',
      accessorKey: 'cliente_razon_social',
      header: 'Razón social',
      size: 220,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div>
            {/* `truncate max-w-55` hace del nombre una caja con ancho propio:
                `mx-auto` centra la CAJA; el `text-center` del `<td>` centra
                el texto dentro de ella y el subtítulo. */}
            <p
              className="mx-auto text-[13px] font-medium text-slate-800 dark:text-white truncate max-w-55"
              title={order.cliente_razon_social ?? undefined}
            >
              {order.cliente_razon_social || '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {order.cliente_nombre || '—'}
            </p>
          </div>
        );
      },
    },
    {
      id: 'piezas',
      header: 'Piezas',
      size: 90,
      enableSorting: false,
      meta: { hideOnMobile: true },
      cell: PendingDataCell,
    },
    {
      id: 'vendedor',
      header: 'Vendedor',
      size: 150,
      enableSorting: false,
      meta: { hideOnMobile: true },
      cell: PendingDataCell,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Fecha',
      size: 110,
      cell: ({ row }) => {
        const createdAt = row.original.created_at;
        return (
          <span className="text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {createdAt ? format(new Date(createdAt), 'd MMM yyyy', { locale: es }) : '—'}
          </span>
        );
      },
    },
    {
      id: 'clasificacion',
      header: 'Clasificación',
      size: 130,
      enableSorting: false,
      meta: { hideOnMobile: true },
      cell: PendingDataCell,
    },
    {
      id: 'subtotal',
      accessorKey: 'subtotal',
      header: 'Importe sin IVA',
      size: 140,
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {formatMoneyValueOrDash(row.original.subtotal)}
        </span>
      ),
    },
    {
      id: 'codigo_postal',
      header: 'C.P.',
      size: 80,
      enableSorting: false,
      meta: { hideOnMobile: true },
      cell: PendingDataCell,
    },
  ];
}
