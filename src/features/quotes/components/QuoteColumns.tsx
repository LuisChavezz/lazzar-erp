"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { capitalize } from "@/src/utils/capitalize";
import { quoteAmountSortingFn } from "@/src/features/quotes/utils/quoteAmountSorting";
import { Quote } from "../interfaces/quote.interface";
import { formatQuoteDateTime, formatQuoteAmountOrDash } from "../utils/quoteDetailsFormatters";
import {
  getQuoteStatusLabel,
  QUOTE_STATUS_CONFIG,
  QUOTE_STATUS_FALLBACK_CLS,
  QUOTE_STATUS_FALLBACK_DOT,
} from "../constants/quoteStatus";
import { useQuoteActionItems } from "./QuoteCardActions";

const columnHelper = createColumnHelper<Quote>();

/**
 * Texto del cliente: la razón social (con el casing de la app), o el nombre
 * comercial si no viene, o `Cliente #N` si el listado no trae ninguno de los
 * dos. Es el MISMO texto en la celda, la búsqueda global y la opción del
 * filtro (que compara contra el id crudo `cliente`).
 */
export const getQuoteClienteLabel = (quote: Quote): string =>
  capitalize(quote.cliente_razon_social?.trim() ?? "") ||
  quote.cliente_nombre?.trim() ||
  `Cliente #${quote.cliente}`;

/**
 * Badge de estatus de una cotización: color de `QUOTE_STATUS_CONFIG` (fuente
 * única, derivada del tablero) y, para un estatus que el front no conoce, el
 * neutro con su nombre resuelto (`getQuoteStatusLabel`), nunca el número crudo.
 */
function QuoteStatusBadge({ quote }: { quote: Quote }) {
  return (
    <StatusBadge
      status={String(quote.estatus)}
      config={QUOTE_STATUS_CONFIG}
      defaultConfig={{
        cls: QUOTE_STATUS_FALLBACK_CLS,
        dot: QUOTE_STATUS_FALLBACK_DOT,
        label: getQuoteStatusLabel(quote),
      }}
    />
  );
}

/**
 * Celda del identificador (esquema de un solo estatus): la cotización no
 * tiene folio propio, así que su `#id` ES el menú de la fila
 * (`FolioActionMenu`, modo folio) y debajo va su estatus. Las acciones son
 * las mismas del tablero (`useQuoteActionItems`, "Ver detalle" primero);
 * callbacks y "en curso" llegan por contexto (`QuoteRowActionsProvider`).
 */
function QuoteIdCell({ quote }: { quote: Quote }) {
  const items = useQuoteActionItems(quote);
  return (
    <FolioActionMenu
      folio={`#${quote.id}`}
      items={items}
      status={<QuoteStatusBadge quote={quote} />}
    />
  );
}

/**
 * Clasificación / C.P. son PLACEHOLDER a propósito, pedidos explícitamente
 * para previsualizar el layout final: `Quote` (listado de
 * `GET /ventas/cotizaciones/`) no expone esos campos todavía. Su celda
 * (`PendingDataCell`) no lee ningún dato — es fija en TODAS las filas hasta
 * que el backend los agregue al listado; ese día, reemplazarla por un `cell`
 * normal con `accessorKey` en cada una.
 */
function PendingDataCell() {
  return <span className="text-slate-400 dark:text-slate-600">—</span>;
}

/**
 * Columnas del listado de cotizaciones. No reciben nada: callbacks y "en
 * curso" llegan al menú por `QuoteRowActionsProvider`; si viajaran por aquí,
 * cada cambio de "en curso" recrearía las columnas y remontaría todas las
 * celdas. El estado de los diálogos vive en `QuoteList`, nunca dentro de la
 * celda (se desmonta al ordenar/filtrar).
 *
 * Alineación: la resuelve `DataTable` con `meta.align` (izquierda por
 * defecto; importes y piezas a la derecha), así que aquí NO se ponen clases
 * `text-*`/`w-full` en encabezados ni celdas.
 */
export const getQuoteColumns = () =>
  [
    columnHelper.accessor("id", {
      header: "Cotización",
      size: 150,
      cell: (info) => <QuoteIdCell quote={info.row.original} />,
    }),
    // El estatus se pinta bajo el `#id`; esta columna, OCULTA por defecto, lo
    // mantiene en la búsqueda global (por su nombre, no por el número) y en
    // el selector de columnas.
    columnHelper.accessor((row) => getQuoteStatusLabel(row), {
      id: "estatus",
      header: "Estatus",
      meta: { hiddenByDefault: true },
      cell: (info) => <QuoteStatusBadge quote={info.row.original} />,
    }),
    columnHelper.accessor((row) => getQuoteClienteLabel(row), {
      id: "cliente",
      header: "Razón social",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: "piezas",
      header: "Piezas",
      meta: { align: "right" },
      size: 80,
      cell: ({ row }) => (
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {row.original.piezas}
        </span>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300">
          {formatQuoteDateTime(row.original.created_at, "d MMM yyyy, HH:mm")}
        </span>
      ),
    }),
    columnHelper.display({
      id: "clasificacion",
      header: "Clasificación",
      cell: PendingDataCell,
    }),
    columnHelper.accessor("importe_sin_iva", {
      id: "importeSinIva",
      header: "Importe sin IVA",
      meta: { align: "right" },
      // Agrupa por moneda y ordena el importe dentro de cada una (EC-618).
      sortingFn: quoteAmountSortingFn,
      cell: ({ row }) => (
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {formatQuoteAmountOrDash(row.original.importe_sin_iva, row.original.moneda_codigo)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "codigoPostal",
      header: "C.P.",
      size: 80,
      cell: PendingDataCell,
    }),
  ] as ColumnDef<Quote>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * - El `#id` filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo de `QUOTE_STATUS_CONFIG` en su orden, con su punto, y al
 *   final cada estatus de las filas que el front no conoce, rotulado con
 *   `getQuoteStatusLabel` (el mismo texto que su badge).
 * - El cliente es un FK: sus opciones salen de las filas, comparan contra el id
 *   crudo `cliente` y se rotulan como la celda (`getQuoteClienteLabel`, con su
 *   respaldo `Cliente #N`), así dos homónimos no se mezclan. Es obligatorio en
 *   el modelo: no hay opción "Sin cliente". Con buscador: el catálogo es largo.
 */
export const QUOTE_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<Quote>>> = {
  id: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(QUOTE_STATUS_CONFIG),
    label: getQuoteStatusLabel,
  },
  cliente: {
    type: "distinct",
    get: (r) => r.cliente,
    label: getQuoteClienteLabel,
    searchable: true,
  },
};
