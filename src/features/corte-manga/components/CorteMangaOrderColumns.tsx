"use client";

import Link from "next/link";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  CORTE_MANGA_ORDER_PRIORITY_CONFIG,
  corteMangaOrderPriorityFallback,
  corteMangaStatusEntry,
} from "../constants/corteMangaOrderStatus";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";

const columnHelper = createColumnHelper<CorteMangaOrder>();

const ActionsCell = ({
  order,
  onViewDetails,
}: {
  order: CorteMangaOrder;
  onViewDetails: (id: number) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetails(order.id) },
  ];
  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${order.folio_ocm}`} />
    </div>
  );
};

/**
 * Columnas del listado de órdenes de corte de manga
 * (`GET /produccion/orden-corte-manga/`).
 *
 * Fábrica —no un arreglo estático— porque la columna de acciones necesita
 * `onViewDetails` para abrir el diálogo de detalle DESDE `CorteMangaOrdersView`,
 * no montado aquí dentro de la fila: el diálogo se abre por `id`, no por el
 * objeto de fila (ver `CorteMangaOrderDetailDialog`), para poder dispararse
 * también desde el enlace del 409 de duplicado
 * (`orden_corte_manga_existente.id`, ver `parseCorteMangaOrderError.ts`), que no
 * siempre tiene la fila completa a la mano. Mismo patrón `getXColumns(callback)`
 * del resto de los listados.
 *
 * Se omiten a propósito varios campos que sí vienen en la respuesta:
 * `empresa`/`sucursal` se muestran por su nombre resuelto y no por su id,
 * `usuario_asignado` igual, `fecha_fin` siempre es `null` y `activo` siempre
 * `true` (el queryset filtra `activo=True`). El contenido de `detalles` se
 * resume en una sola columna — su desglose vive en el diálogo de detalle.
 *
 * Sin edición ni transición de estatus: ninguna tiene endpoint. `estatus_corte`
 * es `read_only` en el serializer y `PUT`/`PATCH` responden 405, así que el
 * badge es de SOLO LECTURA y pinta el valor tal cual llega.
 *
 * Sin anotación de tipo en el retorno (el cast va al final del arreglo) para
 * evitar el error de inferencia ya documentado en `EmbroideryOrderColumns` y
 * `ReflectiveOrderColumns`: con la anotación, TypeScript intenta unificar TODAS
 * las columnas contra `ColumnDef<CorteMangaOrder, unknown>` antes de inferir
 * cada una, y revienta en las columnas `accessor` con un tipo de valor propio
 * (`string`, `string | null`).
 */
export const getCorteMangaOrderColumns = (onViewDetails: (id: number) => void) => [
  columnHelper.accessor("folio_ocm", {
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
        {row.original.folio_ocm}
      </button>
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
    // Folio del pedido clickeable: enlaza al detalle 360° en su ruta NEUTRA
    // `/orders/[id]` (solo exige auth + workspace), con `?from=corte-manga`
    // para que su "Volver" regrese a ESTE listado y no a Mesa de Control, que
    // un usuario solo-Producción no puede abrir. Mismo enlace que ya usa el
    // detalle de la orden (`CorteMangaOrderPageContent`).
    //
    // Sin folio no hay nada que enlazar: se pinta el guion como texto. Se
    // navega por `pedido` (la FK del listado); `pedido_vinculado` —la señal que
    // prefiere el detalle— solo la declara el `retrieve`, no esta respuesta.
    cell: (info) => {
      // `||` y no `??`: el valor ausente llega como `""`, no como `null`.
      const folio = info.getValue();
      return folio ? (
        <Link
          href={`/orders/${info.row.original.pedido}?from=corte-manga`}
          className="font-mono text-sm text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors"
          title="Ver detalle del pedido"
        >
          {folio}
        </Link>
      ) : (
        <span className="font-mono text-sm text-slate-600 dark:text-slate-300">—</span>
      );
    },
  }),
  columnHelper.accessor("estatus_corte", {
    header: "Estatus",
    cell: ({ row }) => (
      <StatusBadge
        status={String(row.original.estatus_corte)}
        config={{
          [row.original.estatus_corte]: corteMangaStatusEntry(
            row.original.estatus_corte,
            row.original.estatus_corte_display,
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
        config={CORTE_MANGA_ORDER_PRIORITY_CONFIG}
        defaultConfig={corteMangaOrderPriorityFallback(info.getValue())}
      />
    ),
  }),
  // Resumen de `detalles`: cuántos renglones y cuántas piezas suman. `cantidad`
  // es un float del backend (número, no el string decimal de inventario).
  //
  // Se descartan los valores no finitos con el MISMO criterio que
  // `computeCorteMangaOrderKpis`, que suma este mismo campo para la tarjeta
  // "Total de Prendas": sin el filtro, un `cantidad` corrupto daría `NaN` aquí
  // y quedaría excluido allá, y la fila y el KPI reportarían totales distintos
  // del mismo dato.
  //
  // NO se resumen aquí `color` ni `configuracion` porque hoy llegan `null` en
  // todas las órdenes: la única ruta de alta viva no los escribe (ver
  // `CorteMangaOrderLine`). Una columna permanentemente vacía se lee como un
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
  // Columna que el listado de reflejante NO tiene: cuando se construyó, su
  // `sucursal_nombre` estaba en el código del backend pero todavía no
  // desplegado, así que allá se tipó `string | undefined` y no se pintó. Aquí sí
  // está desplegado (el esquema OpenAPI en producción lo declara `string`
  // requerido, ver `CorteMangaOrder`), y aporta: el listado es multi-sucursal
  // —el queryset devuelve TODAS las sucursales permitidas del usuario, no solo
  // su `sucursal_default`—, así que sin esta columna dos órdenes de plantas
  // distintas se ven idénticas.
  columnHelper.accessor("sucursal_nombre", {
    header: "Sucursal",
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">
        {info.getValue() || "—"}
      </span>
    ),
  }),
  // `usuario_nombre` llega ya resuelto por el backend
  // (`get_full_name()` o el email). Puede ser `null` en las filas históricas
  // que creó la generación automática desde ventas —deshabilitada desde el
  // 2026-07-31—, que no asignaba usuario; las altas nuevas siempre lo traen.
  // `accessorFn` con `?? ""` por el mismo motivo que `pedido_folio`: mantener
  // la columna dentro de la búsqueda global aunque la primera fila sea una de
  // esas históricas sin operador.
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
    // `useCorteMangaOrders`.
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
  // el caso MÁS probable de los tres: `buildCorteMangaOrderPayload` omite
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
] as ColumnDef<CorteMangaOrder>[];
