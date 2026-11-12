"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { WarningFilledIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import {
  ROTATION_CLASE_CONFIG,
  ROTATION_ESTADO_CONFIG,
  ROTATION_FABRICATION_CELL_CONFIG,
} from "../constants/rotationBoardStatus";
import type { RotationBoardRow } from "../interfaces/rotation-board.interface";
import { rowFabricationCell } from "../utils/rotationBoardFabrication";
import {
  formatPercent,
  formatPieces,
  formatSharePercent,
  formatWeeklyRate,
  formatWeeks,
} from "../utils/rotationBoardFormat";
import {
  RotationClaseHeader,
  RotationEstadoHeader,
  RotationFabricacionHeader,
} from "./RotationBoardHeaderFilters";
import { RotationAmountCell } from "./RotationBoardAmount";
import { WeeklySparkline } from "./WeeklySparkline";

interface RotationBoardColumnsOptions {
  /** `agrupar=producto`: sin SKU/color/talla ni columnas de fabricación. */
  isProductMode: boolean;
  /** `parametros.hasta`, para nombrar las semanas del sparkline. */
  hasta: string | undefined;
  /** Abre el detalle de materiales de la fila (solo por variante). */
  onOpenDetail: (row: RotationBoardRow) => void;
}

const NUMBER_CELL = "tabular-nums text-slate-700 dark:text-slate-200";
const MUTED = "text-[11px] text-slate-400 dark:text-slate-500";
const DETAIL_LINK =
  "font-medium text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer text-left";

const pieces = (value: number | null) => <span className={NUMBER_CELL}>{formatPieces(value)}</span>;

/**
 * Columnas del tablero de rotación. Dos juegos según la agrupación: por
 * producto desaparecen SKU, color, talla y fabricación (y sus filtros y orden,
 * que la definición de producto no tiene) y se muestra cuántas variantes suma.
 *
 * - `meta.serverSort` = campo de `ordering` del backend; `meta.serverFilter` =
 *   la clave del filtro de servidor de su `ColumnHeaderFilter`.
 * - El diálogo vive en la vista (`RotationBoardView`), nunca en la celda: el
 *   SKU solo dispara `onOpenDetail`.
 * - El importe vendido sale de `importe_por_moneda` (una línea por moneda) y
 *   no se ordena: `importe_vendido` nunca se lee ni se pide.
 */
export function getRotationBoardColumns({
  isProductMode,
  hasta,
  onOpenDetail,
}: RotationBoardColumnsOptions): ColumnDef<RotationBoardRow>[] {
  const product: ColumnDef<RotationBoardRow> = {
    id: "producto",
    header: "Producto",
    // Ancho propio: con el de por defecto (150px) los nombres largos se
    // truncarían a pocas letras.
    size: 260,
    meta: { label: "Producto", serverSort: "nombre" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p
          className="truncate font-medium text-slate-800 dark:text-slate-100"
          title={row.original.producto_nombre}
        >
          {row.original.producto_nombre}
        </p>
        <p className={`truncate ${MUTED}`}>{row.original.categoria_nombre ?? "—"}</p>
      </div>
    ),
  };

  const variantIdentity: ColumnDef<RotationBoardRow>[] = [
    {
      id: "sku",
      header: "SKU",
      meta: { label: "SKU", serverSort: "sku" },
      cell: ({ row }) => (
        // Truncada: hay SKUs largos (de QA) que invadirían la columna vecina;
        // el SKU completo se lee en el encabezado del detalle.
        <button
          type="button"
          title="Ver detalle"
          onClick={() => onOpenDetail(row.original)}
          className={`${DETAIL_LINK} block max-w-full truncate whitespace-nowrap`}
        >
          {row.original.sku ?? "—"}
        </button>
      ),
    },
    {
      id: "color",
      header: "Color",
      meta: { label: "Color", hideOnMobile: true },
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.color ?? "—"}</span>,
    },
    {
      id: "talla",
      header: "Talla",
      meta: { label: "Talla", hideOnMobile: true },
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.talla ?? "—"}</span>,
    },
  ];

  const productIdentity: ColumnDef<RotationBoardRow>[] = [
    {
      id: "variantes",
      header: "Variantes",
      meta: { label: "Variantes", align: "right" },
      cell: ({ row }) => (
        <span className={NUMBER_CELL} title={`${row.original.variantes_con_bom ?? 0} con BOM`}>
          {formatPieces(row.original.variantes)}
        </span>
      ),
    },
  ];

  const analysis: ColumnDef<RotationBoardRow>[] = [
    {
      id: "clase_abc",
      header: ({ column }) => <RotationClaseHeader column={column} />,
      meta: { label: "Clase", serverSort: "clase_abc", serverFilter: "clase", align: "center" },
      cell: ({ row }) => (
        <div className="flex flex-col items-center gap-0.5">
          <StatusBadge status={row.original.clase_abc} config={ROTATION_CLASE_CONFIG} />
          <span className={`${MUTED} tabular-nums`}>
            {formatSharePercent(row.original.participacion_pct)}
          </span>
        </div>
      ),
    },
    {
      id: "estado",
      header: ({ column }) => <RotationEstadoHeader column={column} />,
      meta: { label: "Estado", serverFilter: "estado" },
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-0.5">
          <StatusBadge status={row.original.estado} config={ROTATION_ESTADO_CONFIG} />
          {row.original.candidato_descontinuar && (
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              Candidato a descontinuar
            </span>
          )}
        </div>
      ),
    },
    {
      id: "vendido_periodo",
      header: "Vendido",
      meta: { label: "Vendido en el periodo", serverSort: "vendido_periodo", align: "right" },
      cell: ({ row }) => (
        <div className="flex flex-col items-end">
          {pieces(row.original.vendido_periodo)}
          <span className={`${MUTED} tabular-nums`} title="Periodo anterior">
            ant. {formatPieces(row.original.vendido_periodo_anterior)}
          </span>
        </div>
      ),
    },
    {
      // Sin `serverSort` a propósito: ordenar por importe compararía monedas
      // distintas (100 MXN = 100 USD), así que nunca se pide `importe_vendido`.
      id: "importe_por_moneda",
      header: "Importe",
      meta: { label: "Importe vendido", align: "right", hideOnMobile: true },
      cell: ({ row }) => <RotationAmountCell importes={row.original.importe_por_moneda} />,
    },
    {
      id: "tendencia_pct",
      header: "Tendencia",
      meta: { label: "Tendencia", serverSort: "tendencia_pct", align: "right" },
      cell: ({ row }) => {
        const value = row.original.tendencia_pct;
        const tone =
          value === null
            ? "text-slate-400"
            : value < 0
              ? "text-rose-600 dark:text-rose-400"
              : value > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-600 dark:text-slate-300";
        return (
          <span
            className={`tabular-nums ${tone}`}
            title={value === null ? "Sin venta en el periodo anterior" : undefined}
          >
            {formatPercent(value, { signed: true })}
          </span>
        );
      },
    },
    {
      id: "serie_semanal",
      header: "Venta semanal",
      size: 180,
      meta: { label: "Venta semanal", serverSort: "venta_semanal" },
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <WeeklySparkline series={row.original.serie_semanal} hasta={hasta} />
          <span className={`${NUMBER_CELL} text-xs`} title="Promedio de piezas por semana">
            {formatWeeklyRate(row.original.venta_semanal)}
          </span>
        </div>
      ),
    },
    {
      id: "ultima_venta",
      header: "Última venta",
      meta: { label: "Última venta", serverSort: "ultima_venta", hideOnMobile: true },
      cell: ({ row }) => (
        <div className="flex flex-col whitespace-nowrap">
          <span>{formatShortCalendarDate(row.original.ultima_venta)}</span>
          {row.original.dias_sin_venta !== null && (
            <span className={`${MUTED} tabular-nums`}>
              hace {formatPieces(row.original.dias_sin_venta)} d
            </span>
          )}
        </div>
      ),
    },
    {
      id: "existencia",
      header: "Existencia",
      meta: { label: "Existencia", serverSort: "existencia", align: "right" },
      cell: ({ row }) => pieces(row.original.existencia),
    },
    {
      id: "en_proceso",
      header: "En proceso",
      meta: { label: "En proceso (OPs abiertas)", serverSort: "en_proceso", align: "right" },
      cell: ({ row }) => pieces(row.original.en_proceso),
    },
    {
      id: "disponible",
      header: "Disponible",
      meta: { label: "Disponible", serverSort: "disponible", align: "right" },
      cell: ({ row }) => pieces(row.original.disponible),
    },
    {
      id: "cobertura_semanas",
      header: "Cobertura",
      meta: { label: "Cobertura", serverSort: "cobertura_semanas", align: "right" },
      cell: ({ row }) => (
        <span
          className={NUMBER_CELL}
          title={row.original.cobertura_semanas === null ? "Sin venta en el periodo" : undefined}
        >
          {formatWeeks(row.original.cobertura_semanas)}
        </span>
      ),
    },
    {
      id: "resurtido_sugerido",
      header: "Resurtido",
      meta: { label: "Resurtido sugerido", serverSort: "resurtido_sugerido", align: "right" },
      cell: ({ row }) => (
        <span
          className={`tabular-nums ${
            row.original.resurtido_sugerido > 0
              ? "font-semibold text-sky-700 dark:text-sky-400"
              : "text-slate-400"
          }`}
        >
          {formatPieces(row.original.resurtido_sugerido)}
        </span>
      ),
    },
  ];

  const fabrication: ColumnDef<RotationBoardRow>[] = [
    {
      id: "fabricable_con_existencia",
      header: "Fabricable",
      size: 200,
      meta: {
        label: "Fabricable con existencia",
        serverSort: "fabricable_con_existencia",
        align: "right",
      },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col items-end">
          {pieces(row.original.fabricable_con_existencia)}
          {row.original.limitante && (
            <span
              className={`${MUTED} max-w-full truncate`}
              title={`Limita: ${row.original.limitante.componente_nombre}`}
            >
              {row.original.limitante.componente_nombre}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "fabricacion",
      header: ({ column }) => <RotationFabricacionHeader column={column} />,
      meta: { label: "Material", serverFilter: "fabricacion" },
      cell: ({ row }) => {
        const fabricacion = rowFabricationCell(row.original);
        return (
          <div className="flex items-center gap-1.5">
            {fabricacion ? (
              <StatusBadge status={fabricacion} config={ROTATION_FABRICATION_CELL_CONFIG} />
            ) : (
              <span className="text-slate-400" title="Sin resurtido sugerido">
                —
              </span>
            )}
            {row.original.bom_con_alertas && (
              <span
                role="img"
                aria-label="BOM con alertas"
                title="BOM con alertas: unidad distinta a la del inventario o cantidad 0"
                className="inline-flex"
              >
                <WarningFilledIcon className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return isProductMode
    ? [product, ...productIdentity, ...analysis]
    : [product, ...variantIdentity, ...analysis, ...fabrication];
}
