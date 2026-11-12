"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import type { ProductionOrderListItem } from "../interfaces/production-order.interface";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { RouteIcon, ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { PEDIDO_LINK_VISIBLE_CLASS, PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  CantidadCell,
  CentroConfeccionCell,
  FechaCell,
  RUTA_CRITICA_ETAPAS,
  RutaCriticaTracker,
  VenceCell,
} from "./ProductionOrderListCells";
import {
  PRODUCTION_ORDER_PRIORITY_CONFIG,
  PRODUCTION_ORDER_STATUS_CONFIG,
  productionOrderPriorityFallback,
  productionOrderStatusEntry,
} from "../constants/productionOrderStatus";
import { opListPedidoRefs, pedidoRefLabel } from "../utils/opPedidos";

const columnHelper = createColumnHelper<ProductionOrderListItem>();

const FolioCell = ({
  row,
  onViewDetails,
  onOpenCriticalPath,
}: {
  row: ProductionOrderListItem;
  onViewDetails: (id: number) => void;
  onOpenCriticalPath: (row: ProductionOrderListItem) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    {
      label: 'Ver detalle',
      icon: ViewIcon,
      onSelect: () => onViewDetails(row.op_id),
    },
    {
      label: 'Ruta crítica',
      icon: RouteIcon,
      onSelect: () => onOpenCriticalPath(row),
    },
  ];

  return (
    <FolioActionMenu
      folio={row.folio_op}
      items={menuItems}
      status={
        <StatusBadge
          status={String(row.estatus_op)}
          config={{ [row.estatus_op]: productionOrderStatusEntry(row.estatus_op, row.estatus_op_display) }}
        />
      }
    />
  );
};

/**
 * Columnas del listado de órdenes de producción.
 *
 * Fábrica —no un arreglo estático— para inyectar `onViewDetails`, que NAVEGA a
 * `/manufacturing/production-orders/[id]` en vez de abrir un diálogo montado
 * dentro de la celda. Mismo patrón `getXColumns(onViewDetails)` que
 * `getEmbroideryOrderColumns`/`getReflectiveOrderColumns`/
 * `getCorteMangaOrderColumns`; aquí el callback recibe `op_id` (la PK de esta
 * orden), no `id`.
 *
 * `onOpenCriticalPath` solo AVISA al listado, que es dueño del diálogo de ruta
 * crítica: montado dentro de la celda, un refetch o un cambio de página lo
 * desmontaría a media captura.
 */
export function getProductionOrderColumns(
  onViewDetails: (id: number) => void,
  onOpenCriticalPath: (row: ProductionOrderListItem) => void,
): ColumnDef<ProductionOrderListItem, unknown>[] {
  // Una OP puede cubrir varios pedidos (`pedidos`, principal primero); sin ese
  // campo queda el pedido único de siempre (`pedido_folio` o `Pedido #id`).
  // Búsqueda y orden usan la lista de folios como texto.
  const pedidoFolioOf = (row: ProductionOrderListItem) =>
    opListPedidoRefs(row).map(pedidoRefLabel).join(', ');

  return [
    // Folio OP: es el menú de acciones de la fila (con ">") y lleva el estatus
    // a su lado; sin columnas aparte de "Estatus" ni "Acciones".
    columnHelper.accessor('folio_op', {
      header: 'Folio OP',
      size: 180,
      cell: ({ row }) => (
        <FolioCell
          row={row.original}
          onViewDetails={onViewDetails}
          onOpenCriticalPath={onOpenCriticalPath}
        />
      ),
    }),

    // Pedidos ligados: enlace al detalle 360° de cada uno sin abrir la OP. El
    // valor de la columna (búsqueda y orden) es la lista de folios.
    columnHelper.accessor((row) => pedidoFolioOf(row), {
      id: 'pedido',
      header: 'Pedido',
      size: 160,
      cell: ({ row }) => {
        const refs = opListPedidoRefs(row.original);
        if (refs.length === 0) {
          return <span className="text-xs text-slate-400 dark:text-slate-500">Sin pedido</span>;
        }
        // En azul y subrayado punteado desde el inicio: se nota que lleva al pedido.
        return (
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            {refs.map((ref) => (
              <PedidoFolioLink
                key={ref.id}
                pedidoId={ref.id}
                folio={pedidoRefLabel(ref)}
                from="production-orders"
                tone="accent"
                className={PEDIDO_LINK_VISIBLE_CLASS}
              />
            ))}
          </span>
        );
      },
    }),

    // Centro de confección (maquilero o interno).
    columnHelper.accessor((row) => (row.centro_confeccion === null ? 'Interno' : row.centro_confeccion?.nombre ?? ''), {
      id: 'centro_confeccion',
      header: 'Centro de confección',
      size: 170,
      cell: ({ row }) => <CentroConfeccionCell order={row.original} />,
    }),

    columnHelper.accessor((row) => row.fecha_pedido ?? undefined, {
      id: 'fecha_pedido',
      header: 'Fecha pedido',
      size: 115,
      sortUndefined: 'last',
      enableGlobalFilter: false,
      cell: ({ row }) => <FechaCell value={row.original.fecha_pedido} />,
    }),

    columnHelper.accessor((row) => row.fecha_vence ?? undefined, {
      id: 'fecha_vence',
      header: 'Vence',
      size: 110,
      sortUndefined: 'last',
      enableGlobalFilter: false,
      cell: ({ row }) => <VenceCell value={row.original.fecha_vence} />,
    }),

    columnHelper.accessor((row) => row.cantidad_total, {
      id: 'cantidad_total',
      header: 'Cantidad',
      size: 100,
      sortUndefined: 'last',
      enableGlobalFilter: false,
      meta: { align: 'right' },
      cell: ({ row }) => <CantidadCell value={row.original.cantidad_total} />,
    }),

    // Ruta crítica: avance por etapa, ordena por etapas completas.
    columnHelper.accessor(
      (row) =>
        row.ruta_critica
          ? RUTA_CRITICA_ETAPAS.filter(({ key }) => row.ruta_critica?.[key] === 'completo').length
          : undefined,
      {
        id: 'ruta_critica',
        header: 'Ruta crítica',
        size: 150,
        sortUndefined: 'last',
        enableGlobalFilter: false,
        cell: ({ row }) => <RutaCriticaTracker order={row.original} />,
      },
    ),

    // Prioridad
    //
    // Badge y no el entero crudo: el mismo dato se leía "1" aquí y "Alta" en la
    // página de detalle. Mismo par config+fallback que ya usan las columnas de
    // bordado/reflejante/corte de manga.
    columnHelper.accessor('prioridad', {
      header: 'Prioridad',
      size: 90,
      cell: ({ getValue }) => {
        const prioridad = getValue();
        return (
          <StatusBadge
            status={String(prioridad)}
            config={PRODUCTION_ORDER_PRIORITY_CONFIG}
            defaultConfig={productionOrderPriorityFallback(prioridad)}
          />
        );
      },
    }),

    // Fecha inicio
    columnHelper.accessor('fecha_inicio', {
      header: 'Fecha inicio',
      size: 130,
      cell: ({ getValue }) => {
        const fecha = new Date(getValue());
        return (
          <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
            {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    }),

    // Fecha fin
    //
    // `accessorFn` que colapsa `null` a `''` — mismo bug de
    // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
    // `CorteMangaOrderColumns.tsx`. `id` explícito conserva la
    // visibilidad/orden de columna que guarda `DataTable`; `fecha_fin` es
    // nula en toda orden aún no terminada.
    columnHelper.accessor((row) => row.fecha_fin ?? '', {
      id: 'fecha_fin',
      header: 'Fecha fin',
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) {
          return <span className="text-xs text-slate-400 dark:text-slate-600 italic">—</span>;
        }
        const fecha = new Date(val);
        const hoy   = new Date();
        const vencida = fecha < hoy;
        return (
          <span
            className={`text-xs tabular-nums whitespace-nowrap ${
              vencida
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    }),

  ] as ColumnDef<ProductionOrderListItem, unknown>[];
}

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Las opciones salen del listado completo (la tabla es de modo cliente),
 * salvo las columnas `options`: ahí salen del catálogo del front, más los
 * valores de las filas que el catálogo no cubre.
 */
export const PRODUCTION_ORDER_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<ProductionOrderListItem>>> = {
  folio_op: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus_op,
    options: optionsFromConfig(PRODUCTION_ORDER_STATUS_CONFIG),
    label: (r) => productionOrderStatusEntry(r.estatus_op, r.estatus_op_display).label,
  },
  prioridad: {
    type: "options",
    get: (r) => r.prioridad,
    options: optionsFromConfig(PRODUCTION_ORDER_PRIORITY_CONFIG),
    label: (r) => productionOrderPriorityFallback(r.prioridad).label,
  },
  fecha_inicio: { type: "month", get: (r) => r.fecha_inicio },
  fecha_fin: { type: "month", get: (r) => r.fecha_fin, emptyLabel: "Sin fecha fin" },
};
