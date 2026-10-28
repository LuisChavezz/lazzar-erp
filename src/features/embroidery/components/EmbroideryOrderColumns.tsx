"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  EMBROIDERY_COVERAGE_CONFIG,
  EMBROIDERY_STATUS_CONFIG,
  embroideryStatusEntry,
} from "../constants/embroideryStatus";
import type { EmbroideryOrder } from "../interfaces/embroidery.interface";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";

const columnHelper = createColumnHelper<EmbroideryOrder>();

const FolioCell = ({
  order,
  onViewDetails,
}: {
  order: EmbroideryOrder;
  onViewDetails: (id: number) => void;
}) => {
  // Acción única: abre la orden en su página completa
  // (`/manufacturing/embroidery/[id]`). Antes convivían dos entradas —el
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
    <FolioActionMenu
      folio={order.folio_bordado}
      items={menuItems}
      status={
        <StatusBadge
          status={String(order.estatus_bordado)}
          config={{ [order.estatus_bordado]: embroideryStatusEntry(order.estatus_bordado, order.estatus_bordado_display) }}
        />
      }
    />
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
 * sola columna — su desglose vive en el diálogo de detalle. `prioridad` también
 * se omite: el modelo la declara sin `choices` y hoy llega constante, así que en
 * la tabla era una columna de un solo valor; sigue visible (y editable) en el
 * detalle de la orden.
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
  columnHelper.accessor("fecha_inicio", {
    header: "Alta",
    sortingFn: "datetime",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">
        {formatShortDate(info.getValue())}
      </span>
    ),
  }),
  // El folio es el menú de acciones de la fila (con ">") y lleva el estatus a
  // su lado: sin columnas aparte de "Estatus" ni "Acciones".
  columnHelper.accessor("folio_bordado", {
    header: "Folio",
    size: 180,
    cell: ({ row }) => <FolioCell order={row.original} onViewDetails={onViewDetails} />,
  }),
  // `accessorFn` que colapsa `null` a `""` — mismo bug de
  // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
  // `CorteMangaOrderColumns.tsx`/`ReflectiveOrderColumns.tsx`. `id` explícito
  // conserva la visibilidad/orden de columna que guarda `DataTable`.
  columnHelper.accessor((row) => row.pedido_folio ?? "", {
    id: "pedido_folio",
    header: "Pedido",
    // Folio del pedido clickeable: enlaza al detalle 360° en su ruta NEUTRA
    // `/orders/[id]` (su regla en `routePermissions` se cumple con CUALQUIERA
    // de varios códigos, entre ellos `R-PRODUCCION-OB`), con `?from=embroidery` para
    // que su "Volver" regrese a ESTE listado y no a Mesa de Control, que un
    // usuario solo-Producción no puede abrir. Mismo enlace que ya usa el
    // detalle de la orden (`EmbroideryOrderDetailContent`).
    //
    // Sin folio el guion también enlaza (`PedidoFolioLink`): el id existe
    // siempre. Se navega por `pedido` (la FK del listado); `pedido_vinculado`
    // —la señal que prefiere el detalle— solo la declara el `retrieve`, no
    // esta respuesta.
    cell: (info) => (
      <PedidoFolioLink
        pedidoId={info.row.original.pedido}
        folio={info.getValue()}
        from="embroidery"
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
] as ColumnDef<EmbroideryOrder>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Las opciones salen del listado completo (la tabla es de modo cliente),
 * salvo las columnas `options`: ahí salen del catálogo del front, más los
 * valores de las filas que el catálogo no cubre.
 */
export const EMBROIDERYORDER_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<EmbroideryOrder>>> = {
  folio_bordado: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus_bordado,
    options: optionsFromConfig(EMBROIDERY_STATUS_CONFIG),
    label: (r) => embroideryStatusEntry(r.estatus_bordado, r.estatus_bordado_display).label,
  },
  pedido_folio: { type: "presence", get: (r) => r.pedido_folio, con: "Con pedido", sin: "Sin pedido" },
  cobertura: { type: "boolean", get: (r) => r.cobertura_completa, yes: "Cobertura completa", no: "Cobertura parcial" },
  usuario_nombre: { type: "distinct", get: (r) => r.usuario_nombre },
  fecha_inicio: { type: "month", get: (r) => r.fecha_inicio },
  observaciones: { type: "presence", get: (r) => r.observaciones, con: "Con observaciones", sin: "Sin observaciones" },
};
