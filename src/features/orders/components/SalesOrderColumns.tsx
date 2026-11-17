'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FolioActionMenu } from '@/src/components/FolioActionMenu';
import { ViewIcon } from '@/src/components/Icons';
import { StatusBadge, type StatusBadgeConfigEntry } from '@/src/components/StatusBadge';
import { parseLocalDate } from '@/src/utils/formatDate';
import { formatOrderAmountOrDash } from '../utils/orderAmountFormat';
import type { PedidoListItem } from '../interfaces/order.interface';
import { isOrderConfirmed } from '../utils/pedidoConfirmacion';
import { hasMeaningfulOc } from '../utils/pedidoFormat';
import { pedidoDetailHref, type PedidoDetailOrigin } from '../constants/pedidoDetailOrigins';
import {
  getPedidoClasificacionLabel,
  getPedidoEstatusBadge,
} from '../constants/pedidoStatus';
import {
  PedidoCatalogHeaderFilter,
  PedidoConfirmadoHeaderFilter,
  PedidoEstatusHeaderFilter,
  SIN_CLASIFICACION_FILTER_OPTION,
} from './PedidoHeaderFilters';

/**
 * Columnas de "Mis pedidos" (Ventas, `GET /ventas/pedidos/`). NO reusa
 * `createOrderColumns` de `SharedOrderColumns.tsx` a propósito: este layout
 * diverge (otro orden y set de columnas, sin Fecha confirmada) mientras que
 * Compras, WMS y Mesa de Control siguen con sus propias columnas sin cambios
 * — ver `OrderListView` (`variant`).
 *
 * Esquema de un solo estatus (EC-755, como `QuoteColumns`): el folio ES el
 * menú de la fila (`FolioActionMenu`, solo «Ver detalle») y debajo va el
 * badge del estatus del pedido (`getPedidoEstatusBadge`); una columna
 * "Estatus" oculta por defecto lo deja en el selector de columnas. La
 * confirmación tiene su propia columna, «Confirmado».
 *
 * Tabla en MODO SERVIDOR (`salesPedidosTable`): el filtro de estatus
 * (`?estatus=`, «Cancelado» incluido) vive en el encabezado de Folio, el de
 * confirmación (`?confirmado=`) en el de Confirmado, el de mes (`?mes=`) en el
 * de Fecha y el de clasificación (`?clasificacion=`, con «Sin clasificación»
 * primero) en el de Clasificación; las opciones de mes y clasificación salen
 * de `opciones/?mis_pedidos=true`. `meta.serverSort` es el campo de `ordering`
 * del backend. El backend no busca en fechas: el filtro de mes sustituye a la
 * búsqueda por fecha de la tabla en memoria.
 *
 * Piezas, Vendedor y Clasificación leen `PedidoListItem` (`piezas`,
 * `vendedor_nombre`, `clasificacion`; la clasificación con la misma etiqueta
 * que el detalle, `getPedidoClasificacionLabel`) y se pueden ordenar. C.P. sigue
 * siendo PLACEHOLDER a propósito, pedido explícitamente para previsualizar el
 * layout final: su celda (`PendingDataCell`) no lee ningún dato — C.P. no viene
 * en el listado y traerlo por fila con un fetch de detalle aparte (N+1) no vale
 * la pena solo por la columna. Las columnas secundarias llevan
 * `meta: { hideOnMobile: true }` para no competir por espacio en pantallas
 * angostas; Confirmado no, porque es la única que muestra y filtra la
 * confirmación.
 *
 * "Importe sin IVA" es `PedidoListItem.subtotal`, que el listado QUITA a
 * quien no ve importes de pedidos: sin permiso la columna no se monta.
 */
export interface SalesOrderColumnsOptions {
  /** Llave `?from=` del detalle 360° que abre «Ver detalle». */
  from: PedidoDetailOrigin;
  /** ¿El usuario ve importes de pedidos? (columna, orden por importe). */
  showAmounts: boolean;
}

/**
 * Sin mapa propio: `getPedidoEstatusBadge` ya da la entrada completa de
 * cualquier estatus (conocido o "Desconocido (n)"), así que va como
 * `defaultConfig` sobre un `config` vacío.
 */
const NO_BADGE_CONFIG: Record<string, StatusBadgeConfigEntry> = {};

function PedidoEstatusBadge({ estatus }: { estatus: number }) {
  return (
    <StatusBadge
      status={String(estatus)}
      config={NO_BADGE_CONFIG}
      defaultConfig={getPedidoEstatusBadge(estatus)}
    />
  );
}

/**
 * Celda del folio (esquema de un solo estatus): el folio dispara el menú de la
 * fila, cuya única acción es «Ver detalle» (un enlace real al detalle 360°, el
 * mismo destino que tenía el folio), y debajo van el estatus y la OC.
 */
function PedidoFolioCell({ order, from }: { order: PedidoListItem; from: PedidoDetailOrigin }) {
  return (
    <FolioActionMenu
      // Sin folio, "—" (lo pinta `FolioActionMenu`); el menú sigue abriendo y
      // el lector de pantalla lo nombra con el id del pedido.
      folio={order.folio ?? ''}
      menuLabel={order.folio || `pedido #${order.id}`}
      items={[{ label: 'Ver detalle', icon: ViewIcon, href: pedidoDetailHref(order.id, from) }]}
      status={
        <div className="flex items-center gap-2 flex-wrap">
          <PedidoEstatusBadge estatus={order.estatus} />
          {hasMeaningfulOc(order.oc) && (
            <span
              className="text-[11px] text-slate-400 dark:text-slate-500 font-mono"
              title={`Orden de compra: ${order.oc}`}
            >
              OC {order.oc}
            </span>
          )}
        </div>
      }
    />
  );
}

/** Confirmado / Por confirmar según `fecha_confirmacion`, con los puntos del filtro. */
function PedidoConfirmacionCell({ order }: { order: PedidoListItem }) {
  const confirmed = isOrderConfirmed(order);
  const fecha = parseLocalDate(order.fecha_confirmacion);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[13px] text-slate-700 dark:text-slate-200 whitespace-nowrap"
      title={fecha ? `Confirmado el ${format(fecha, 'd MMM yyyy', { locale: es })}` : undefined}
    >
      <span
        className={`h-2 w-2 rounded-full shrink-0 ${confirmed ? 'bg-cyan-500' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
      {confirmed ? 'Confirmado' : 'Por confirmar'}
    </span>
  );
}

function PendingDataCell() {
  return <span className="text-[13px] text-slate-300 dark:text-slate-600">—</span>;
}

export function createSalesOrderColumns({
  from,
  showAmounts,
}: SalesOrderColumnsOptions): ColumnDef<PedidoListItem, unknown>[] {
  const columns: ColumnDef<PedidoListItem, unknown>[] = [
    {
      id: 'folio',
      accessorKey: 'folio',
      meta: { label: 'Folio', serverSort: 'folio', serverFilter: 'estatus' },
      header: ({ column }) => <PedidoEstatusHeaderFilter column={column} title="Folio" />,
      size: 190,
      cell: ({ row }) => <PedidoFolioCell order={row.original} from={from} />,
    },
    // El estatus se pinta bajo el folio; esta columna, OCULTA por defecto, lo
    // deja en el selector de columnas. Ordena por el NÚMERO del estatus (lo
    // que ordena el backend), no por su nombre.
    {
      id: 'estatus',
      accessorFn: (order) => getPedidoEstatusBadge(order.estatus).label,
      header: 'Estatus',
      size: 140,
      meta: { label: 'Estatus', hiddenByDefault: true, serverSort: 'estatus' },
      cell: ({ row }) => <PedidoEstatusBadge estatus={row.original.estatus} />,
    },
    {
      id: 'cliente',
      accessorKey: 'cliente_razon_social',
      header: 'Razón social',
      meta: { label: 'Razón social', serverSort: 'cliente_razon_social' },
      size: 220,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div>
            <p
              className="text-[13px] font-medium text-slate-800 dark:text-white truncate max-w-55"
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
      accessorKey: 'piezas',
      header: 'Piezas',
      size: 90,
      meta: { align: "right", label: 'Piezas', hideOnMobile: true, serverSort: 'piezas' },
      cell: ({ row }) => (
        <span className="text-[13px] tabular-nums text-slate-700 dark:text-slate-200">
          {row.original.piezas}
        </span>
      ),
    },
    {
      id: 'vendedor',
      // Vacío → `undefined` para que `sortUndefined: "last"` lo deje al final.
      accessorFn: (order) => order.vendedor_nombre || undefined,
      header: 'Vendedor',
      size: 150,
      // El backend deja los vacíos al final en ambos sentidos.
      meta: { label: 'Vendedor', hideOnMobile: true, serverSort: 'vendedor_nombre' },
      cell: ({ row }) => (
        <span className="block text-[13px] text-slate-700 dark:text-slate-200 truncate max-w-37.5">
          {row.original.vendedor_nombre || '—'}
        </span>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { label: 'Fecha', serverSort: 'created_at', serverFilter: 'mes' },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Fecha"
          catalog="mes"
          label="mes"
          misPedidos
        />
      ),
      size: 120,
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
      id: 'confirmado',
      accessorFn: (order) => order.fecha_confirmacion ?? '',
      header: ({ column }) => <PedidoConfirmadoHeaderFilter column={column} title="Confirmado" />,
      size: 150,
      // Ordena por la fecha de confirmación: agrupa confirmados y por confirmar.
      // Visible también en móvil: es el único sitio de la confirmación y de su
      // filtro (antes vivían en el folio, que siempre se ve).
      meta: {
        label: 'Confirmado',
        serverSort: 'fecha_confirmacion',
        serverFilter: 'confirmado',
      },
      cell: ({ row }) => <PedidoConfirmacionCell order={row.original} />,
    },
    {
      id: 'clasificacion',
      // Ordena por código (A–F, X); sin clasificación, al final.
      accessorFn: (order) => order.clasificacion || undefined,
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Clasificación"
          catalog="clasificacion"
          label="clasificación"
          misPedidos
          pinnedOptions={[SIN_CLASIFICACION_FILTER_OPTION]}
        />
      ),
      // Etiqueta más larga: "X - Solo para facturar", igual que en Programación.
      size: 180,
      meta: {
        label: 'Clasificación',
        hideOnMobile: true,
        serverSort: 'clasificacion',
        serverFilter: 'clasificacion',
      },
      cell: ({ row }) => (
        <span className="text-[13px] text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      ),
    },
    {
      id: 'codigo_postal',
      header: 'C.P.',
      size: 80,
      meta: { hideOnMobile: true },
      cell: PendingDataCell,
    },
  ];

  if (showAmounts) {
    // Antes de C.P., como siempre estuvo.
    columns.splice(columns.length - 1, 0, {
      id: 'subtotal',
      accessorKey: 'subtotal',
      header: 'Importe sin IVA',
      meta: { align: "right", label: 'Importe sin IVA', serverSort: 'subtotal' },
      size: 140,
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.subtotal)}
        </span>
      ),
    });
  }

  return columns;
}
