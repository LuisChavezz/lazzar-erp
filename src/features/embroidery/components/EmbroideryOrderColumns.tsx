"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ExternalLinkIcon, ViewIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  EMBROIDERY_COVERAGE_CONFIG,
  EMBROIDERY_PRIORITY_CONFIG,
  EMBROIDERY_STATUS_CONFIG,
  embroideryPriorityFallback,
} from "../constants/embroideryStatus";
import type { EmbroideryOrder } from "../interfaces/embroidery.interface";

const columnHelper = createColumnHelper<EmbroideryOrder>();

const ActionsCell = ({
  order,
  onViewDetails,
  onViewProgress,
}: {
  order: EmbroideryOrder;
  onViewDetails: (id: number) => void;
  onViewProgress: (id: number) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetails(order.id) },
    // Abre la MISMA orden en su página completa
    // (`/manufacturing/embroidery/[id]`), no otro dato: convive con "Ver
    // Detalles" porque cada una sirve a un uso distinto —el diálogo para mirar
    // una orden sin perder la tabla (filtros, página, scroll), la página para
    // quedarse en ella, enlazarla o navegar a su pedido y a sus órdenes
    // hermanas—.
    //
    // NO se rotula "Avance" ni lleva un icono de tendencia: en este repo
    // "Avance" ya significa progreso MEDIDO (columna de picking/packing) y el
    // backend tiene un endpoint propio para eso (`bordado-avances`) que esta
    // página no consume. La etiqueta y el icono de enlace externo describen lo
    // que la acción hace de verdad: abrir la ficha completa.
    {
      label: "Ver detalle completo",
      icon: ExternalLinkIcon,
      onSelect: () => onViewProgress(order.id),
    },
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
 * Fábrica —no un arreglo estático— porque la columna de acciones necesita sus
 * dos callbacks (`onViewDetails`, `onViewProgress`) DESDE `EmbroideryView`, no
 * montado aquí dentro de la fila: el diálogo se abre por `id`, no por el
 * objeto de fila (ver `EmbroideryOrderDetailDialog`), para poder disparse a
 * futuro también desde el enlace del 409 de duplicado (`orden_bordado_existente.id`,
 * ver `parseEmbroideryOrderError.ts`), que no siempre tendrá la fila completa
 * a la mano. Mismo patrón `getXColumns(callback)` del resto de los listados.
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
export const getEmbroideryOrderColumns = (
  onViewDetails: (id: number) => void,
  onViewProgress: (id: number) => void,
) => [
  columnHelper.accessor("folio_bordado", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
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
    cell: (info) => (
      <StatusBadge status={String(info.getValue())} config={EMBROIDERY_STATUS_CONFIG} />
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
    cell: ({ row }) => (
      <ActionsCell
        order={row.original}
        onViewDetails={onViewDetails}
        onViewProgress={onViewProgress}
      />
    ),
  }),
] as ColumnDef<EmbroideryOrder>[];
