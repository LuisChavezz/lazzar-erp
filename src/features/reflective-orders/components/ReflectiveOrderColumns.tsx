"use client";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  REFLECTIVE_ORDER_COVERAGE_CONFIG,
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
  // `accessorFn` que colapsa `null` a `""`, en vez de `accessor("pedido_folio")`,
  // POR LA BÚSQUEDA GLOBAL — no por estética. `DataTable` no configura
  // `getColumnCanGlobalFilter`, así que rige el de TanStack por defecto, que
  // decide si una columna es buscable mirando SOLO el valor de la PRIMERA fila
  // (`flatRows[0]`) y exigiendo `typeof value === "string" | "number"`. Como
  // `typeof null === "object"`, basta con que la fila de arriba traiga el campo
  // nulo para que la columna quede fuera de la búsqueda EN TODAS las filas. Y
  // aquí es un escenario común, no teórico: la lista se ordena por
  // `fecha_inicio` descendente, así que la primera fila es el alta más reciente
  // —`Pedido.folio` es nullable, y `observaciones`/`usuario_nombre` lo son con
  // más razón todavía—.
  //
  // `id` se fija explícito porque un `accessorFn` no puede derivarlo: conserva
  // la llave con la que `DataTable` guarda visibilidad y orden de columnas.
  columnHelper.accessor((row) => row.pedido_folio ?? "", {
    id: "pedido_folio",
    header: "Pedido",
    // `||` y no `??`: ahora el valor ausente llega como `""`, no como `null`.
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {info.getValue() || "—"}
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
  // Cobertura de la orden sobre su pedido. El backend la calcula para la
  // página entera (2 queries agrupadas), así que esta columna no cuesta
  // ninguna petición extra.
  //
  // SOLO el badge, en una línea — misma decisión ya tomada en bordado: la
  // fracción ("10 / 40") y el porcentaje ocupaban tres renglones en una tabla
  // donde el resto de las celdas es de una sola línea, descuadrando la altura
  // de la fila. Las cifras completas no se pierden: el bloque "Cobertura del
  // pedido" del diálogo de detalle las muestra con su porcentaje, que es donde
  // tiene sentido leerlas con calma.
  //
  // Se ordena por `cobertura_completa`, el MISMO valor que se pinta: ordenar
  // por `cantidad_cubierta` —el número que no se ve— dejaría las filas en un
  // orden que el usuario no podría explicar mirando la columna.
  columnHelper.accessor((row) => row.cobertura_completa, {
    id: "cobertura",
    header: "Cobertura",
    cell: ({ row }) => (
      <StatusBadge
        status={String(row.original.cobertura_completa)}
        config={REFLECTIVE_ORDER_COVERAGE_CONFIG}
      />
    ),
  }),
  // Columna que bordado NO puede tener: `OrdenReflejanteSerializer` resuelve el
  // nombre del operador (`usuario_nombre`), mientras que `OrdenBordadoSerializer`
  // solo expone el id. Llega `null` en las órdenes generadas automáticamente
  // desde ventas, que no asignan usuario (ver `ReflectiveOrder`).
  // `accessorFn` con `?? ""` por el mismo motivo que `pedido_folio`: mantener
  // la columna dentro de la búsqueda global aunque la primera fila sea una
  // orden generada automáticamente desde ventas, que no asigna usuario.
  columnHelper.accessor((row) => row.usuario_nombre ?? "", {
    id: "usuario_nombre",
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
  // `accessorFn` con `?? ""` por el mismo motivo que `pedido_folio`, y aquí es
  // el caso MÁS probable de los tres: `buildReflectiveOrderPayload` omite
  // `observaciones` cuando queda vacío, así que el backend guarda `null` y
  // cualquier alta sin notas —lo habitual— deja la primera fila con el campo
  // nulo, sacando la columna de la búsqueda global.
  columnHelper.accessor((row) => row.observaciones ?? "", {
    id: "observaciones",
    header: "Observaciones",
    cell: (info) => (
      <span
        className="block max-w-64 truncate text-sm text-slate-600 dark:text-slate-300"
        // `|| undefined` y no `?? undefined`: sin notas el valor es `""`, y un
        // `title=""` pintaría un tooltip vacío al pasar el cursor.
        title={info.getValue() || undefined}
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
