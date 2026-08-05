"use client";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  REFLECTIVE_ORDER_PRIORITY_CONFIG,
  REFLECTIVE_ORDER_STATUS_CONFIG,
  reflectiveOrderPriorityFallback,
} from "../constants/reflectiveOrderStatus";
import type { ReflectiveOrder } from "../interfaces/reflective-order.interface";

const columnHelper = createColumnHelper<ReflectiveOrder>();

const ActionsCell = ({
  order,
  onViewDetails,
}: {
  order: ReflectiveOrder;
  onViewDetails: (id: number) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetails(order.id) },
  ];
  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${order.folio_reflejante}`} />
    </div>
  );
};

/**
 * Columnas del listado de órdenes de reflejante
 * (`GET /produccion/orden-reflejante/`).
 *
 * Fábrica —no un arreglo estático— porque la columna de acciones necesita
 * `onViewDetails` para abrir el diálogo de detalle DESDE `ReflectiveOrdersView`,
 * no montado aquí dentro de la fila: el diálogo se abre por `id`, no por el
 * objeto de fila (ver `ReflectiveOrderDetailDialog`), para poder dispararse
 * también desde el enlace del 409 de duplicado
 * (`orden_reflejante_existente.id`, ver `parseReflectiveOrderError.ts`), que no
 * siempre tiene la fila completa a la mano. Mismo patrón `getXColumns(callback)`
 * del resto de los listados.
 *
 * Se omiten a propósito varios campos que sí vienen en la respuesta:
 * `empresa`/`sucursal` llegan como ids crudos sin nombre resuelto (un número
 * suelto no le dice nada al usuario), `usuario_asignado` se muestra por su
 * nombre resuelto y no por su id, `fecha_fin` siempre es `null` y `activo`
 * siempre `true` (el queryset filtra `activo=True`). El contenido de `detalles`
 * se resume en una sola columna — su desglose vive en el diálogo de detalle.
 *
 * Sin edición ni transición de estatus: ninguna tiene endpoint (`PUT`/`PATCH`
 * → 405).
 *
 * Sin anotación de tipo en el retorno (el cast va al final del arreglo) para
 * evitar el error de inferencia ya documentado en `EmbroideryOrderColumns`: con
 * la anotación, TypeScript intenta unificar TODAS las columnas contra
 * `ColumnDef<ReflectiveOrder, unknown>` antes de inferir cada una, y revienta
 * en las columnas `accessor` con un tipo de valor propio (`string`,
 * `string | null`).
 */
export const getReflectiveOrderColumns = (onViewDetails: (id: number) => void) => [
  columnHelper.accessor("folio_reflejante", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("pedido_folio", {
    header: "Pedido",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("estatus_reflejante", {
    header: "Estatus",
    cell: (info) => (
      <StatusBadge
        status={String(info.getValue())}
        config={REFLECTIVE_ORDER_STATUS_CONFIG}
      />
    ),
  }),
  columnHelper.accessor("prioridad", {
    header: "Prioridad",
    cell: (info) => (
      <StatusBadge
        status={String(info.getValue())}
        config={REFLECTIVE_ORDER_PRIORITY_CONFIG}
        defaultConfig={reflectiveOrderPriorityFallback(info.getValue())}
      />
    ),
  }),
  // Resumen de `detalles`: cuántos renglones y cuántas piezas suman. `cantidad`
  // es un float del backend (número, no el string decimal de inventario).
  //
  // Se descartan los valores no finitos con el MISMO criterio que
  // `computeReflectiveOrderKpis`, que suma este mismo campo para la tarjeta
  // "Total de Prendas": sin el filtro, un `cantidad` corrupto daría `NaN` aquí
  // y quedaría excluido allá, y la fila y el KPI reportarían totales distintos
  // del mismo dato.
  //
  // NO se resumen aquí `metros` ni `tipo_reflejante`/`posicion` —los campos
  // propios del reflejante— porque hoy llegan en `0`/`null` (ver
  // `ReflectiveOrderLine`): una columna permanentemente vacía se lee como un
  // dato faltante, no como una capacidad pendiente del backend.
  columnHelper.display({
    id: "detalles_resumen",
    header: "Prendas",
    cell: ({ row }) => {
      const { detalles } = row.original;
      const totalPiezas = detalles.reduce(
        (acc, linea) => (Number.isFinite(linea.cantidad) ? acc + linea.cantidad : acc),
        0,
      );
      return (
        <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">
          {detalles.length} {detalles.length === 1 ? "línea" : "líneas"} ·{" "}
          {formatQuantityValue(totalPiezas)} pzas
        </span>
      );
    },
  }),
  // Columna que bordado NO puede tener: `OrdenReflejanteSerializer` resuelve el
  // nombre del operador (`usuario_nombre`), mientras que `OrdenBordadoSerializer`
  // solo expone el id. Llega `null` en las órdenes generadas automáticamente
  // desde ventas, que no asignan usuario (ver `ReflectiveOrder`).
  columnHelper.accessor("usuario_nombre", {
    header: "Operador",
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("fecha_inicio", {
    header: "Alta",
    // NO el `sortingFn: "datetime"` incorporado de TanStack: compara los
    // valores crudos con `>`/`<`, que para un `string` es orden LEXICOGRÁFICO,
    // no cronológico. DRF omite la parte fraccionaria cuando los microsegundos
    // son exactamente `0`, así que dos altas del mismo segundo pueden
    // serializarse como `...T15:49:25-06:00` y `...T15:49:25.037413-06:00`, y
    // como texto `-` (0x2D) ordena antes que `.` (0x2E) — la más reciente
    // quedaría primero al revés. Mismo problema (y misma solución,
    // `Date.parse`) que ya resuelve el orden por defecto en
    // `useReflectiveOrders`.
    sortingFn: (rowA, rowB, columnId) => {
      const a = Date.parse(rowA.getValue(columnId));
      const b = Date.parse(rowB.getValue(columnId));
      const ambasValidas = Number.isFinite(a) && Number.isFinite(b);
      return ambasValidas ? a - b : 0;
    },
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">
        {formatShortDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("observaciones", {
    header: "Observaciones",
    cell: (info) => (
      <span
        className="block max-w-64 truncate text-sm text-slate-600 dark:text-slate-300"
        title={info.getValue() ?? undefined}
      >
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.display({
    id: "acciones",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell order={row.original} onViewDetails={onViewDetails} />,
  }),
] as ColumnDef<ReflectiveOrder>[];
