"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import {
  BanIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  EditIcon,
  EyeIcon,
} from "@/src/components/Icons";
import { formatOrderAmountOrDash } from "@/src/features/orders/utils/orderAmountFormat";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import {
  canEditPedidoMesaControl,
  canProgramarPedido,
  getPedidoClasificacionLabel,
  getTipoPedidoConfig,
  PEDIDO_ESTATUS,
  TIPO_PEDIDO,
} from "@/src/features/orders/constants/pedidoStatus";
import { isOrderConfirmed } from "@/src/features/orders/utils/pedidoConfirmacion";
import { formatFolioCorto, hasMeaningfulOc } from "@/src/features/orders/utils/pedidoFormat";
import { getProgramacionesValidas } from "@/src/features/orders/utils/pedidoProgramacion";
import { getPedidoProgramadoProgress } from "@/src/features/orders/utils/pedidoProgramadoProgress";
import { pedidoDetailHref, pedidoDetailPath } from "@/src/features/orders/constants/pedidoDetailOrigins";
import {
  PedidoCatalogHeaderFilter,
  PedidoConfirmadoHeaderFilter,
  PedidoRangeHeaderFilter,
} from "@/src/features/orders/components/PedidoHeaderFilters";
import {
  PIEZAS_RANGE_OPTIONS,
  SUBTOTAL_RANGE_OPTIONS,
} from "@/src/features/orders/utils/pedidoListParams";

/**
 * Columnas de Pedidos en Mesa de Control. NO reusa `createOrderColumns` de
 * `SharedOrderColumns.tsx` a propósito: ese archivo sigue sirviendo a Almacén
 * y Compras sin cambios (columnas Estado/Acciones separadas). Aquí, siguiendo
 * el mismo patrón que `SalesOrderColumns.tsx`, el folio funciona como trigger
 * del menú completo de acciones y lleva el punto de color de confirmación —
 * sin columnas aparte de "Estado"/"Acciones".
 */
export interface OperationsOrderColumnCallbacks {
  onProgramar: (order: PedidoListItem) => void;
  onCancel: (order: PedidoListItem) => void;
}

/**
 * Piezas ya programadas: suma de `cantidad` de las parcialidades guardadas en
 * `programacion_conf` (lo mismo que lista "Pedidos programados"). `null` si el
 * pedido no tiene programación. Se compara contra `piezas_programables`, no
 * contra `piezas`: es el total que el backend permite programar.
 */
export const getPiezasProgramadas = (order: PedidoListItem) => {
  const { programado } = getPedidoProgramadoProgress(order);
  return programado > 0 ? programado : null;
};

/**
 * Piezas surtidas por WMS contra las piezas del pedido: "X de Y" con barra
 * (verde al completar). "—" mientras el backend no mande `piezas_surtidas`.
 */
const SurtidoCell = ({ order }: { order: PedidoListItem }) => {
  const surtidas = order.piezas_surtidas;
  const total = order.piezas;
  if (surtidas === undefined || total <= 0) {
    return <span className="text-sm text-slate-400 dark:text-slate-600">—</span>;
  }
  const pct = Math.min(100, Math.round((surtidas / total) * 100));
  const completo = pct >= 100;
  return (
    <div className="inline-flex flex-col items-end gap-1" title={`${pct}% surtido`}>
      <span className="tabular-nums text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
        <span
          className={`font-semibold ${
            surtidas === 0
              ? "text-slate-400 dark:text-slate-500"
              : completo
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-800 dark:text-white"
          }`}
        >
          {surtidas.toLocaleString("es-MX")}
        </span>{" "}
        de {total.toLocaleString("es-MX")}
      </span>
      <span
        className="h-1 w-16 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Piezas surtidas"
      >
        <span
          className={`block h-full rounded-full ${completo ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
};

/**
 * "X de Y" con una barra delgada: verde al completar, azul en curso. Sin
 * `piezas_programables` (backend anterior) solo pinta lo programado; un pedido
 * sin piezas programables no tiene nada que programar.
 */
const ProgramadoCell = ({ order }: { order: PedidoListItem }) => {
  // Mismo cálculo que el resto del módulo (`getPedidoProgramadoProgress`):
  // lee `parcialidades` o `programacion_conf` y no pinta nada en cancelados.
  const { programado: programadas, total, visible } = getPedidoProgramadoProgress(order);
  const parcialidades = getProgramacionesValidas(
    order.parcialidades !== undefined ? { programaciones: order.parcialidades } : order.programacion_conf,
  ).length;

  if (!visible) {
    return <span className="text-sm text-slate-400 dark:text-slate-600">—</span>;
  }

  const pct = total > 0 ? Math.min(100, Math.round((programadas / total) * 100)) : 0;
  const completo = pct >= 100;
  return (
    <div
      className="inline-flex flex-col items-end gap-1"
      title={`${parcialidades} ${parcialidades === 1 ? "parcialidad" : "parcialidades"} · ${pct}%`}
    >
      <span className="tabular-nums text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
        <span
          className={`font-semibold ${
            programadas === 0
              ? "text-slate-400 dark:text-slate-500"
              : completo
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-800 dark:text-white"
          }`}
        >
          {programadas.toLocaleString("es-MX")}
        </span>{" "}
        de {total.toLocaleString("es-MX")}
      </span>
      <span
        className="h-1 w-16 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Piezas programadas"
      >
        <span
          className={`block h-full rounded-full ${completo ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
};

/**
 * "Solo muestras" si todas sus piezas son de muestra, "Con muestras" si solo
 * algunas; `null` sin muestras o sin el dato (`piezas_muestra`).
 */
export const getMuestrasLabel = (
  order: Pick<PedidoListItem, "piezas" | "piezas_muestra">,
): string | null => {
  const muestras = order.piezas_muestra ?? 0;
  if (muestras <= 0) return null;
  return muestras >= order.piezas ? "Solo muestras" : "Con muestras";
};

const MUESTRA_BADGE_CLASS = getTipoPedidoConfig(TIPO_PEDIDO.MUESTRA).className;

const FolioCell = ({
  order,
  onProgramar,
  onCancel,
}: {
  order: PedidoListItem;
} & OperationsOrderColumnCallbacks) => {
  const confirmed = isOrderConfirmed(order);
  const muestrasLabel = getMuestrasLabel(order);

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalle",
      icon: EyeIcon,
      // Enlace real (`href`) al detalle 360°: Next lo prefetchea y clic
      // medio/Ctrl+clic abren otra pestaña. `from=operations` hace que el
      // "Volver" regrese a esta Mesa de Control.
      href: pedidoDetailHref(order.id, "operations"),
    },
    // Tallas con stock y faltante + parcialidades: sustituye también al antiguo
    // "Revisar inventario". Solo para pedidos confirmados y no cancelados
    // (EC-748, `canProgramarPedido`).
    {
      label: "Programar",
      icon: CalendarDaysIcon,
      onSelect: () => onProgramar(order),
      permission: "E-MESACONTROL-PEDIDOS",
      visible: canProgramarPedido(order),
    },
    // La fecha de confirmación se edita en la cabecera del detalle del pedido.
    {
      // Edición del pedido con sincronización a su cotización de origen. Enlace
      // real, como "Ver detalle": prefetch y clic medio/Ctrl+clic.
      label: "Editar",
      icon: EditIcon,
      href: `${pedidoDetailPath(order.id)}/edit-mesa-control`,
      permission: "E-MESACONTROL-PEDIDOS",
      visible: canEditPedidoMesaControl(order.estatus),
      tone: "warning",
    },
    // Un CANCELADO legado (`activo = true`, de antes de `/cancelar/`) sigue
    // listándose, pero no hay nada que cancelar.
    {
      label: "Cancelar pedido",
      icon: BanIcon,
      onSelect: () => onCancel(order),
      permission: "E-MESACONTROL-PEDIDOS",
      visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO,
      tone: "danger",
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${confirmed ? "bg-cyan-500" : "bg-amber-500"}`}
        aria-hidden="true"
      />
      {/* Folio arriba; debajo, la confirmación EN PALABRA (badge discreto,
          como Compras) y la OC. */}
      <div className="flex flex-col items-start gap-1 min-w-0">
      <ActionMenu
        items={items}
        ariaLabel={`Acciones del pedido ${order.folio}`}
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones del pedido ${order.folio}`}
            title="Ver detalle"
            className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span title={order.folio || undefined}>{formatFolioCorto(order.folio) || "—"}</span>
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
      <div className="flex items-center gap-1 min-w-0">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${
            confirmed
              ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          }`}
        >
          {confirmed ? "Confirmado" : "Por confirmar"}
        </span>
        {muestrasLabel && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${MUESTRA_BADGE_CLASS}`}
            title={`${order.piezas_muestra} de ${order.piezas} piezas son muestra`}
          >
            {muestrasLabel}
          </span>
        )}
        {hasMeaningfulOc(order.oc) && (
          <span
            className="inline-flex max-w-32 items-center truncate px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
            title={`Orden de compra: ${order.oc}`}
          >
            OC {order.oc}
          </span>
        )}
      </div>
      </div>
    </div>
  );
};

export interface OperationsOrderColumnsOptions {
  /**
   * ¿El usuario ve importes de pedidos? Sin permiso el backend quita
   * `subtotal` e ignora su filtro y su orden: la columna no se monta.
   */
  showAmounts: boolean;
}

/**
 * Columnas de la tabla de Mesa de Control en MODO SERVIDOR: `meta.serverSort`
 * es el campo de `ordering` del backend (lista blanca en `mesaPedidosTable`) y
 * `meta.serverFilter`, la clave del filtro. Las opciones de los filtros son
 * fijas o salen de `opciones/` (`PedidoHeaderFilters`), nunca de las filas.
 */
export function buildOperationsOrderColumns(
  callbacks: OperationsOrderColumnCallbacks,
  { showAmounts }: OperationsOrderColumnsOptions,
): ColumnDef<PedidoListItem, unknown>[] {
  const columns: ColumnDef<PedidoListItem, unknown>[] = [
    {
      id: "folio",
      accessorKey: "folio",
      // Punto + folio (`P-00000-2026` en mono) + chevron miden ~124px; con el
      // ancho por defecto (150px, 118 útiles) la celda se partía en dos
      // líneas y el punto quedaba encima del folio. Mismo ancho que el folio
      // de `SalesOrderColumns.tsx`.
      size: 190,
      meta: { label: "Folio", serverSort: "folio", serverFilter: "confirmado" },
      header: ({ column }) => <PedidoConfirmadoHeaderFilter column={column} title="Folio" />,
      cell: ({ row }) => <FolioCell order={row.original} {...callbacks} />,
    },
    {
      id: "razon_social",
      accessorKey: "cliente_razon_social",
      size: 240,
      // Por id de cliente: dos razones sociales iguales no se mezclan.
      meta: { label: "Razón social", serverSort: "cliente_razon_social", serverFilter: "cliente" },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Razón social"
          catalog="cliente"
          label="razón social"
          searchPlaceholder="Buscar cliente…"
        />
      ),
      cell: ({ row }) => (
        <span
          className="block text-sm text-slate-600 dark:text-slate-300 truncate"
          title={row.original.cliente_razon_social ?? undefined}
        >
          {row.original.cliente_razon_social || "—"}
        </span>
      ),
    },
    {
      // Todas las tallas, muestras incluidas (EC-571). El filtro junta rangos
      // de piezas y muestras en un solo embudo (`rango_piezas`).
      id: "piezas",
      accessorKey: "piezas",
      meta: {
        align: "right",
        label: "Piezas",
        serverSort: "piezas",
        serverFilter: "rango_piezas",
      },
      header: ({ column }) => (
        <PedidoRangeHeaderFilter
          column={column}
          title="Piezas"
          label="piezas o muestras"
          options={PIEZAS_RANGE_OPTIONS}
        />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300">
          {row.original.piezas}
        </span>
      ),
    },
    {
      // Piezas ya programadas por Mesa de Control; "—" si aún no se programa.
      // SIN orden: la celda suma las parcialidades válidas (enteras positivas,
      // `getPedidoProgramadoProgress`) y el `piezas_programadas` del backend
      // suma cualquier cantidad numérica y no viene en la respuesta, así que
      // ordenar por él no coincidiría con lo que se ve.
      id: "programado",
      accessorFn: (order) => getPiezasProgramadas(order) ?? undefined,
      header: "Programado",
      meta: { align: "right", label: "Programado" },
      size: 150,
      cell: ({ row }) => <ProgramadoCell order={row.original} />,
    },
    {
      // Piezas surtidas por WMS (pickings): la misma anotación que ordena.
      id: "surtido",
      accessorFn: (order) => order.piezas_surtidas,
      header: "Surtido",
      meta: { align: "right", label: "Surtido", serverSort: "piezas_surtidas" },
      size: 150,
      cell: ({ row }) => <SurtidoCell order={row.original} />,
    },
    {
      // Vendedor de la cotización de origen; `null` sin cotización (EC-571).
      // Filtra por id del vendedor (`opciones/`), no por el nombre que se ve.
      id: "vendedor",
      accessorFn: (order) => order.vendedor_nombre || undefined,
      meta: { label: "Vendedor", serverSort: "vendedor_nombre", serverFilter: "vendedor" },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Vendedor"
          catalog="vendedor"
          label="vendedor"
          searchPlaceholder="Buscar vendedor…"
        />
      ),
      cell: ({ row }) => (
        <span className="block text-sm text-slate-600 dark:text-slate-300 truncate max-w-45">
          {row.original.vendedor_nombre || "—"}
        </span>
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      meta: { label: "Fecha", serverSort: "created_at", serverFilter: "mes" },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter column={column} title="Fecha" catalog="mes" label="mes" />
      ),
      cell: ({ row }) => {
        const createdAt = row.original.created_at;
        return (
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {createdAt ? format(new Date(createdAt), "d MMM yyyy", { locale: es }) : "—"}
          </span>
        );
      },
    },
    {
      // Misma etiqueta que el detalle del pedido y que Programación
      // (`getPedidoClasificacionLabel`). Ordena por código.
      id: "clasificacion",
      accessorFn: (order) => order.clasificacion || undefined,
      meta: { label: "Clasificación", serverSort: "clasificacion", serverFilter: "clasificacion" },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Clasificación"
          catalog="clasificacion"
          label="clasificación"
        />
      ),
      // Etiqueta más larga: "X - Solo para facturar", igual que en Programación.
      size: 180,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      ),
    },
  ];

  if (showAmounts) {
    columns.push({
      id: "importe_sin_iva",
      accessorKey: "subtotal",
      header: ({ column }) => (
        <PedidoRangeHeaderFilter
          column={column}
          title="Importe sin IVA"
          label="rango de importe"
          options={SUBTOTAL_RANGE_OPTIONS}
          menuAlign="end"
        />
      ),
      meta: {
        align: "right",
        label: "Importe sin IVA",
        serverSort: "subtotal",
        serverFilter: "rango_subtotal",
      },
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.subtotal)}
        </span>
      ),
    });
  }

  columns.push({
    // PLACEHOLDER: `PedidoListItem` no expone código postal.
    id: "cp",
    header: "C.P.",
    cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
  });

  return columns;
}
