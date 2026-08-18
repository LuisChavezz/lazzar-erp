"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  EMBROIDERY_COVERAGE_CONFIG,
  EMBROIDERY_PRIORITY_CONFIG,
  embroideryPriorityFallback,
  embroideryStatusEntry,
} from "../constants/embroideryStatus";
import type { EmbroideryOrder } from "../interfaces/embroidery.interface";

const columnHelper = createColumnHelper<EmbroideryOrder>();

const ActionsCell = ({
  order,
  onViewDetails,
}: {
  order: EmbroideryOrder;
  onViewDetails: (id: number) => void;
}) => {
  // Acción única: abre la orden en su página completa
  // (`/wms/embroidery/[id]`). Antes convivían dos entradas —el
  // diálogo sobre la tabla y la página— para la MISMA orden; se dejó solo la
  // página, que además de todo el detalle permite quedarse en ella, enlazarla y
  // navegar a su pedido y a sus órdenes hermanas.
  //
  // El diálogo (`EmbroideryOrderDetailDialog`) NO desaparece: sigue montado en
  // `EmbroideryView` para el 409 de duplicado del alta, que abre por id una
  // orden que puede no estar en la tabla.
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetails(order.id) },
  ];
  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${order.folio_bordado}`} />
    </div>
  );
};

/**
 * Columnas del listado de órdenes de bordado (`GET /produccion/orden-bordado/`).
 *
 * Fábrica —no un arreglo estático— porque la columna de acciones necesita su
 * callback (`onViewDetails`) DESDE `EmbroideryView`: la navegación se hace con
 * el `router` de la vista, y la acción se resuelve por `id`, no por el objeto
 * de fila. Mismo patrón `getXColumns(callback)` del resto de los listados.
 *
 * Se omiten a propósito varios campos que sí vienen en la respuesta:
 * `empresa`/`sucursal`/`usuario_asignado` llegan como ids crudos sin nombre
 * resuelto (un número suelto no le dice nada al usuario en la TABLA; en el
 * diálogo de detalle sí se muestran, rotulados como identificador — ver
 * `EmbroideryOrderDetailDialog`); `fecha_fin` siempre es `null` y `activo`
 * siempre `true` (el queryset filtra `activo=True`), así que ninguna
 * aportaría información aquí. El contenido de `detalles` se resume en una
 * sola columna — su desglose vive en el diálogo de detalle.
 *
 * Sin edición ni transición de estatus en el menú de acciones: ninguna tiene
 * endpoint (`PUT`/`PATCH` → 405).
 *
 * Sin anotación de tipo en el retorno (el cast va al final del arreglo) para
 * evitar el mismo error de inferencia documentado en
 * `EmbroideryOrderMockForm`: con la anotación,
 * TypeScript intenta unificar TODAS las columnas contra
 * `ColumnDef<EmbroideryOrder, unknown>` antes de inferir cada una, y revienta
 * en las columnas `accessor` con un tipo de valor propio (`string`,
 * `string | null`).
 */
export const getEmbroideryOrderColumns = (onViewDetails: (id: number) => void) => [
  columnHelper.accessor("folio_bordado", {
    header: "Folio",
    // Folio clickeable: navega al detalle con el MISMO callback que la acción
    // "Ver Detalles" (recibe `id`, la PK de esta orden). Mismo patrón que el
    // folio del listado de pedidos (`SharedOrderColumns`).
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onViewDetails(row.original.id)}
        className="font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
        title="Ver detalle"
      >
        {row.original.folio_bordado}
      </button>
    ),
  }),
  // `accessorFn` que colapsa `null` a `""` — mismo bug de
  // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
  // `CorteMangaOrderColumns.tsx`/`ReflectiveOrderColumns.tsx`. `id` explícito
  // conserva la visibilidad/orden de columna que guarda `DataTable`.
  columnHelper.accessor((row) => row.pedido_folio ?? "", {
    id: "pedido_folio",
    header: "Pedido",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("estatus_bordado", {
    header: "Estatus",
    cell: ({ row }) => (
      <StatusBadge
        status={String(row.original.estatus_bordado)}
        config={{
          [row.original.estatus_bordado]: embroideryStatusEntry(
            row.original.estatus_bordado,
            row.original.estatus_bordado_display,
          ),
        }}
      />
    ),
  }),
  columnHelper.accessor("prioridad", {
    header: "Prioridad",
    cell: (info) => (
      <StatusBadge
        status={String(info.getValue())}
        config={EMBROIDERY_PRIORITY_CONFIG}
        defaultConfig={embroideryPriorityFallback(info.getValue())}
      />
    ),
  }),
  // Resumen de `detalles`: cuántos renglones y cuántas piezas suman. `cantidad`
  // es un float del backend (número, no el string decimal de inventario).
  //
  // Se descartan los valores no finitos con el MISMO criterio que
  // `computeEmbroideryKpis`, que suma este mismo campo para la tarjeta "Total
  // de Prendas": sin el filtro, un `cantidad` corrupto daría `NaN` aquí y
  // quedaría excluido allá, y la fila y el KPI reportarían totales distintos
  // del mismo dato.
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
  // Cobertura de la orden sobre su pedido. El backend la calcula para la
  // página entera (2 queries agrupadas), así que esta columna no cuesta
  // ninguna petición extra.
  //
  // SOLO el badge, en una línea. Antes acompañaba al badge con la fracción
  // ("5 / 40") y el porcentaje: en una tabla donde el resto de las celdas son
  // de una sola línea, ese bloque de tres renglones descuadraba la altura de
  // la fila y se leía como un fallo de maquetación. Las cifras completas no se
  // pierden — el bloque "Cobertura del pedido" del diálogo de detalle las
  // muestra con su porcentaje, que es donde tiene sentido leerlas con calma.
  //
  // Se ordena por `cobertura_completa`, el MISMO valor que se pinta: ordenar
  // por `cantidad_cubierta` —el número que ya no se ve— dejaría las filas en
  // un orden que el usuario no podría explicar mirando la columna.
  columnHelper.accessor((row) => row.cobertura_completa, {
    id: "cobertura",
    header: "Cobertura",
    cell: ({ row }) => (
      <StatusBadge
        status={String(row.original.cobertura_completa)}
        config={EMBROIDERY_COVERAGE_CONFIG}
      />
    ),
  }),
  columnHelper.accessor("fecha_inicio", {
    header: "Alta",
    sortingFn: "datetime",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">
        {formatShortDate(info.getValue())}
      </span>
    ),
  }),
  // Mismo `accessorFn` y mismo motivo que `pedido_folio` (ver el bloque de
  // arriba): `observaciones` es opcional al crear la orden.
  columnHelper.accessor((row) => row.observaciones ?? "", {
    id: "observaciones",
    header: "Observaciones",
    cell: (info) => (
      <span
        className="block max-w-64 truncate text-sm text-slate-600 dark:text-slate-300"
        // `||` y no `??`: el valor ausente ahora llega como `""`, y `??` NO lo
        // atrapa — dejaría `title=""`, un tooltip vacío en vez de ninguno.
        title={info.getValue() || undefined}
      >
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: "acciones",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell order={row.original} onViewDetails={onViewDetails} />,
  }),
] as ColumnDef<EmbroideryOrder>[];
