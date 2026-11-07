"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { capitalize } from "@/src/utils/capitalize";
import { Quote } from "../interfaces/quote.interface";
import { formatQuoteDateTime, formatQuoteAmountOrDash } from "../utils/quoteDetailsFormatters";
import {
  getQuoteStatusLabel,
  QUOTE_STATUS_CONFIG,
  QUOTE_STATUS_FALLBACK_CLS,
} from "../constants/quoteStatus";
import { useQuoteActionItems } from "./QuoteCardActions";
import { QuoteClienteHeaderFilter, QuoteEstatusHeaderFilter } from "./QuoteHeaderFilters";

const columnHelper = createColumnHelper<Quote>();

/**
 * Texto del cliente: la razón social (con el casing de la app), o el nombre
 * comercial si no viene, o `Cliente #N` si el listado no trae ninguno de los
 * dos. Es el MISMO texto en la celda, la búsqueda global y la opción del
 * filtro (que compara contra el id crudo `cliente`). Un borrador SIN cliente
 * (`cliente: null`) da `""`: es un dato real, no un nombre sin resolver, así
 * que la celda pinta «—» y la búsqueda no indexa un texto inventado.
 */
export const getQuoteClienteLabel = (quote: Quote): string =>
  quote.cliente == null
    ? ""
    : capitalize(quote.cliente_razon_social?.trim() ?? "") ||
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
        // El punto lo completa el neutro de `StatusBadge`.
        cls: QUOTE_STATUS_FALLBACK_CLS,
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
 * Columnas del listado de cotizaciones, en MODO SERVIDOR: `meta.serverSort` es
 * el campo de `ordering` del backend (`quotesTable`) y `meta.serverFilter`, la
 * clave del filtro; las opciones de los filtros las pintan los encabezados
 * (`QuoteHeaderFilters`) desde catálogos, nunca desde las filas. Una columna
 * sin `serverSort` no ordena. `meta.label` nombra la columna en el selector y
 * en las exportaciones cuando el encabezado es un componente.
 *
 * No reciben nada: callbacks y "en curso" llegan al menú por
 * `QuoteRowActionsProvider`; si viajaran por aquí, cada cambio de "en curso"
 * recrearía las columnas y remontaría todas las celdas. El estado de los
 * diálogos vive en `QuoteList`, nunca dentro de la celda.
 *
 * Alineación: la resuelve `DataTable` con `meta.align` (izquierda por
 * defecto; importes y piezas a la derecha), así que aquí NO se ponen clases
 * `text-*`/`w-full` en encabezados ni celdas.
 */
export const getQuoteColumns = () =>
  [
    // El `#id` filtra por estatus (su badge) y ordena por id.
    columnHelper.accessor("id", {
      header: ({ column }) => <QuoteEstatusHeaderFilter column={column} title="Cotización" />,
      meta: { label: "Cotización", serverSort: "id", serverFilter: "estatus" },
      size: 150,
      cell: (info) => <QuoteIdCell quote={info.row.original} />,
    }),
    // El estatus se pinta bajo el `#id`; esta columna, OCULTA por defecto, lo
    // deja en el selector de columnas y en las exportaciones (por su nombre).
    // Ordena por el NÚMERO del estatus (lo que ordena el backend), no por su
    // nombre.
    columnHelper.accessor((row) => getQuoteStatusLabel(row), {
      id: "estatus",
      header: "Estatus",
      meta: { hiddenByDefault: true, serverSort: "estatus" },
      cell: (info) => <QuoteStatusBadge quote={info.row.original} />,
    }),
    // El VALOR de la columna es la razón social cruda, tal como la manda el
    // backend: es lo que leen las exportaciones CSV/PDF (por `accessorFn`).
    // El formato de pantalla vive SOLO en la celda. El `id` es el de antes de
    // EC-752, el que usa el PDF para darle su ancho (`getColumnWeight`).
    // Filtra por el id del cliente (o "Sin cliente"), no por el texto.
    columnHelper.accessor((row) => row.cliente_razon_social ?? "", {
      id: "cliente_razon_social",
      header: ({ column }) => <QuoteClienteHeaderFilter column={column} title="Razón social" />,
      meta: { label: "Razón social", serverSort: "cliente__razon_social", serverFilter: "cliente" },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">
          {getQuoteClienteLabel(info.row.original) || "—"}
        </span>
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
      meta: { serverSort: "created_at" },
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
      // El backend agrupa por moneda y ordena el importe dentro de cada una
      // (EC-618, EC-811).
      meta: { align: "right", serverSort: "importe_sin_iva" },
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
