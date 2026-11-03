import { createColumnHelper, type ColumnDef, type FilterFn, type Row } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatKpiDate, formatKpiPct, formatKpiTaggedCurrencyAmount } from "@/src/utils/kpiFormat";
import {
  SUPPLIER_PUNCTUALITY_STATUS_CONFIG,
  toPunctualityStatus,
} from "../constants/supplierKpiPunctualityStatus";
import type {
  SupplierKpiFulfillmentRecord,
  SupplierKpiPriceRecord,
  SupplierKpiPunctualityRecord,
  SupplierKpiQualityRecord,
} from "../interfaces/supplier-kpi-detail.interface";

/**
 * Columnas de cada pestaña del detalle por factor de un proveedor
 * (`SupplierKpiDetailDialog`). Cada factor muestra solo SUS campos. Hoy
 * ninguna celda tiene acciones; si las tiene, entran como callbacks de su
 * factoría. Los folios van en texto: las rutas de OC y recepción exigen otros
 * permisos que el de esta página.
 *
 * La búsqueda global de `DataTable` compara el VALOR de cada columna, así que
 * el accessor devuelve el texto que muestra la celda (etiqueta del estatus,
 * fecha dd/mm/aaaa, "#125"), nunca `null`, y el orden se fija aparte con
 * `sortingFn` sobre el dato crudo cuando ese texto no ordena bien (mismo patrón
 * que `AbsenceColumns`).
 */

const FOLIO_CLASS = "font-medium text-slate-700 dark:text-slate-200";

const punctuality = createColumnHelper<SupplierKpiPunctualityRecord>();

const PUNCTUALITY_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(SUPPLIER_PUNCTUALITY_STATUS_CONFIG).map(([status, cfg]) => ({
    value: status,
    label: cfg.label ?? status,
    dotClassName: cfg.dot,
  })),
];

/** Filtro EXACTO sobre el estatus derivado de `a_tiempo`, no sobre la etiqueta que lee la búsqueda. */
const punctualityStatusFilterFn: FilterFn<SupplierKpiPunctualityRecord> = (row, _columnId, filterValue) =>
  filterValue === undefined || toPunctualityStatus(row.original.a_tiempo) === filterValue;

/** Orden por la fecha cruda "YYYY-MM-DD" (la celda la muestra dd/mm/aaaa); sin fecha, primero. */
const byRawDate =
  (pick: (record: SupplierKpiPunctualityRecord) => string | null) =>
  (a: Row<SupplierKpiPunctualityRecord>, b: Row<SupplierKpiPunctualityRecord>) =>
    (pick(a.original) ?? "").localeCompare(pick(b.original) ?? "");

export const getSupplierPunctualityColumns = (): ColumnDef<SupplierKpiPunctualityRecord>[] =>
  [
    punctuality.accessor(
      (row) => SUPPLIER_PUNCTUALITY_STATUS_CONFIG[toPunctualityStatus(row.a_tiempo)].label ?? "",
      {
        id: "estatus",
        header: ({ column }) => (
          <FilterHeader title="Estatus" column={column} options={PUNCTUALITY_FILTER_OPTIONS} label="estatus" />
        ),
        meta: { label: "Estatus" },
        filterFn: punctualityStatusFilterFn,
        cell: (info) => (
          <StatusBadge
            status={toPunctualityStatus(info.row.original.a_tiempo)}
            config={SUPPLIER_PUNCTUALITY_STATUS_CONFIG}
          />
        ),
      },
    ),
    punctuality.accessor((row) => textOrDash(row.recepcion_folio), {
      id: "recepcion_folio",
      header: "Recepción",
      cell: (info) => <span className={FOLIO_CLASS}>{info.getValue()}</span>,
    }),
    punctuality.accessor((row) => row.oc_folio || `#${row.oc_id}`, {
      id: "oc_folio",
      header: "OC",
      cell: (info) => <span className={FOLIO_CLASS}>{info.getValue()}</span>,
    }),
    punctuality.accessor((row) => formatKpiDate(row.fecha_recepcion), {
      id: "fecha_recepcion",
      header: "Fecha de recepción",
      sortingFn: byRawDate((record) => record.fecha_recepcion),
    }),
    punctuality.accessor((row) => formatKpiDate(row.fecha_entrega_estimada), {
      id: "fecha_entrega_estimada",
      header: "Fecha prometida",
      sortingFn: byRawDate((record) => record.fecha_entrega_estimada),
    }),
  ] as ColumnDef<SupplierKpiPunctualityRecord>[];

const quality = createColumnHelper<SupplierKpiQualityRecord>();

export const getSupplierQualityColumns = (): ColumnDef<SupplierKpiQualityRecord>[] =>
  [
    quality.accessor((row) => textOrDash(row.recepcion_folio), {
      id: "recepcion_folio",
      header: "Recepción",
      cell: (info) => <span className={FOLIO_CLASS}>{info.getValue()}</span>,
    }),
    quality.accessor((row) => textOrDash(row.producto), {
      id: "producto",
      header: "Producto",
    }),
    quality.accessor("cantidad_rechazada", {
      header: "Cantidad rechazada",
      meta: { align: "right" },
      cell: (info) => <span className="tabular-nums">{formatQuantityValue(info.getValue())}</span>,
    }),
    quality.accessor((row) => textOrDash(row.motivo_rechazo), {
      id: "motivo_rechazo",
      header: "Motivo",
    }),
  ] as ColumnDef<SupplierKpiQualityRecord>[];

const fulfillment = createColumnHelper<SupplierKpiFulfillmentRecord>();

export const getSupplierFulfillmentColumns = (): ColumnDef<SupplierKpiFulfillmentRecord>[] =>
  [
    fulfillment.accessor((row) => row.folio || `#${row.oc_id}`, {
      id: "folio",
      header: "OC",
      cell: (info) => <span className={FOLIO_CLASS}>{info.getValue()}</span>,
    }),
    fulfillment.accessor((row) => row.unidad || "Sin unidad", {
      id: "unidad",
      header: "Unidad",
    }),
    fulfillment.accessor("cantidad_ordenada", {
      header: "Ordenada",
      meta: { align: "right" },
      cell: (info) => <span className="tabular-nums">{formatQuantityValue(info.getValue())}</span>,
    }),
    fulfillment.accessor("cantidad_recibida", {
      header: "Recibida neta",
      meta: { align: "right" },
      cell: (info) => <span className="tabular-nums">{formatQuantityValue(info.getValue())}</span>,
    }),
    fulfillment.accessor("pct", {
      header: "% recibido",
      meta: { align: "right" },
      cell: (info) => <span className="tabular-nums">{formatKpiPct(info.getValue())}</span>,
    }),
  ] as ColumnDef<SupplierKpiFulfillmentRecord>[];

const price = createColumnHelper<SupplierKpiPriceRecord>();

/**
 * Precio en la moneda de SU fila (nunca se suman entre filas); "—" si el campo
 * no viajó. Variante "tagged": la columna Moneda ya muestra el código.
 */
const priceCell = (value: number | undefined, moneda: string) => (
  <span className="tabular-nums whitespace-nowrap">
    {value === undefined ? "—" : formatKpiTaggedCurrencyAmount(value, moneda)}
  </span>
);

const priceBaseColumns = (): ColumnDef<SupplierKpiPriceRecord>[] =>
  [
    price.accessor((row) => row.factura_folio || `#${row.factura_id}`, {
      id: "factura_folio",
      header: "Factura",
      cell: (info) => <span className={FOLIO_CLASS}>{info.getValue()}</span>,
    }),
    price.accessor((row) => `#${row.oc_id}`, {
      id: "oc_id",
      header: "OC",
      sortingFn: (a, b) => a.original.oc_id - b.original.oc_id,
      cell: (info) => <span className={FOLIO_CLASS}>{info.getValue()}</span>,
    }),
    price.accessor((row) => textOrDash(row.producto), {
      id: "producto",
      header: "Producto",
    }),
    price.accessor("moneda", {
      header: "Moneda",
    }),
  ] as ColumnDef<SupplierKpiPriceRecord>[];

const priceAmountColumns = (): ColumnDef<SupplierKpiPriceRecord>[] =>
  [
    price.accessor("precio_facturado", {
      header: "Precio facturado",
      meta: { align: "right" },
      cell: (info) => priceCell(info.getValue(), info.row.original.moneda),
    }),
    price.accessor("precio_pactado", {
      header: "Precio pactado",
      meta: { align: "right" },
      cell: (info) => priceCell(info.getValue(), info.row.original.moneda),
    }),
  ] as ColumnDef<SupplierKpiPriceRecord>[];

/**
 * Sin `puede_ver_importes` el backend no manda los precios: las columnas de
 * importe no se pintan (la pestaña lo avisa), el resto de la fila sí.
 */
export const getSupplierPriceColumns = (canSeeAmounts: boolean): ColumnDef<SupplierKpiPriceRecord>[] =>
  canSeeAmounts ? [...priceBaseColumns(), ...priceAmountColumns()] : priceBaseColumns();
