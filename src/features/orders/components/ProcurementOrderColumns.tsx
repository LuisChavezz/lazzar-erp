'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRightIcon } from '@/src/components/Icons';
import { formatOrderAmountOrDash } from '../utils/orderAmountFormat';
import { parseLocalDate } from '@/src/utils/formatDate';
import type { PedidoListItem } from '../interfaces/order.interface';
import { getPedidoEstatusBadge } from '../constants/pedidoStatus';
import { hasMeaningfulOc } from '../utils/pedidoFormat';
import type { PedidoDetailOrigin } from '../constants/pedidoDetailOrigins';
import { PedidoFolioLink } from './PedidoFolioLink';
import {
  PedidoCatalogHeaderFilter,
  PedidoEstatusHeaderFilter,
  PedidoRangeHeaderFilter,
} from './PedidoHeaderFilters';
import { GRAN_TOTAL_RANGE_OPTIONS } from '../utils/pedidoListParams';

/**
 * Columnas de "Pedidos" vistos desde Compras/SCM (`GET /ventas/pedidos/`,
 * `OrderListView` con `variant="procurement"`). Mismo estándar visual que
 * `PurchaseOrderColumns.tsx` (folio como elemento principal con su estatus
 * reducido a un punto de color, referencia secundaria como mini-pill, sin
 * columna de Acciones cuando no hay más acción que "ver detalle" — el folio
 * ya navega). Tabla en MODO SERVIDOR: `meta.serverSort` es el campo de
 * `ordering` del backend (`procurementPedidosTable`) y `meta.serverFilter`, la
 * clave del filtro; las opciones son fijas o salen de `opciones/`
 * (`PedidoHeaderFilters`), nunca de las filas.
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
   * ¿El usuario ve importes de pedidos? Sin permiso el backend quita
   * `gran_total` e ignora su filtro y su orden: la columna no se monta.
   */
  showAmounts: boolean;
}

export function createProcurementOrderColumns({
  from,
  showAmounts,
}: ProcurementOrderColumnsOptions): ColumnDef<PedidoListItem, unknown>[] {
  const columns: ColumnDef<PedidoListItem, unknown>[] = [
    {
      id: 'folio',
      accessorKey: 'folio',
      meta: { label: 'Folio', serverSort: 'folio', serverFilter: 'estatus' },
      header: ({ column }) => <PedidoEstatusHeaderFilter column={column} title="Folio" />,
      size: 190,
      cell: ({ row }) => {
        const order = row.original;
        const badge = getPedidoEstatusBadge(order.estatus);
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${badge.dot}`}
              title={badge.label}
              aria-hidden="true"
            />
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
              {/* Estatus como badge discreto (mismo que Recepciones) junto a la OC. */}
              <div className="flex items-center gap-1 min-w-0">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
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
          </div>
        );
      },
    },
    {
      id: 'cliente',
      accessorKey: 'cliente_razon_social',
      // Por id de cliente, no por el nombre que se muestra.
      meta: { label: 'Cliente', serverSort: 'cliente_razon_social', serverFilter: 'cliente' },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Cliente"
          catalog="cliente"
          label="cliente"
          searchPlaceholder="Buscar cliente…"
        />
      ),
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
      meta: { label: 'Fecha', serverSort: 'created_at', serverFilter: 'mes' },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter column={column} title="Fecha" catalog="mes" label="mes" />
      ),
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
    {
      // Opciones de `opciones/`: un mes por cada mes con confirmaciones y
      // "Sin confirmar" (`?mes_confirmacion=sin_confirmar`).
      id: 'fecha_confirmacion',
      accessorFn: (order) => order.fecha_confirmacion ?? '',
      meta: {
        label: 'Fecha confirmada',
        serverSort: 'fecha_confirmacion',
        serverFilter: 'mes_confirmacion',
      },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Fecha confirmada"
          catalog="mes_confirmacion"
          label="mes de confirmación"
        />
      ),
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
  ];

  if (showAmounts) {
    columns.push({
      id: 'gran_total',
      accessorKey: 'gran_total',
      header: ({ column }) => (
        <PedidoRangeHeaderFilter
          column={column}
          title="Total"
          label="rango de total"
          options={GRAN_TOTAL_RANGE_OPTIONS}
          menuAlign="end"
        />
      ),
      meta: {
        align: 'right',
        label: 'Total',
        serverSort: 'gran_total',
        serverFilter: 'rango_gran_total',
      },
      size: 130,
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.gran_total)}
        </span>
      ),
    });
  }

  return columns;
}
