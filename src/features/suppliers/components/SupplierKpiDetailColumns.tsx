import { createColumnHelper, type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import {
  formatKpiDate,
  formatKpiPct,
  formatKpiTaggedCurrencyAmount,
  formatKpiTaggedSignedCurrencyAmount,
} from "@/src/utils/kpiFormat";
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
 * (`SupplierKpiDetailDialog`). Cada factor muestra solo SUS campos; ninguna
 * celda tiene estado ni acciones, así que son constantes de módulo (salvo
 * precio, que depende de `puede_ver_importes`). Los folios van en texto: las
 * rutas de OC y recepción exigen otros permisos que el de esta página.
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

/** Filtro EXACTO sobre el estatus derivado de `a_tiempo` (en memoria: la lista no se pagina). */
const punctualityStatusFilterFn: FilterFn<SupplierKpiPunctualityRecord> = (row, _columnId, filterValue) =>
  filterValue === undefined || toPunctualityStatus(row.original.a_tiempo) === filterValue;

export const SUPPLIER_PUNCTUALITY_COLUMNS = [
  punctuality.accessor((row) => toPunctualityStatus(row.a_tiempo), {
    id: "estatus",
    header: ({ column }) => (
      <FilterHeader title="Estatus" column={column} options={PUNCTUALITY_FILTER_OPTIONS} label="estatus" />
    ),
    meta: { label: "Estatus" },
    filterFn: punctualityStatusFilterFn,
    cell: (info) => <StatusBadge status={info.getValue()} config={SUPPLIER_PUNCTUALITY_STATUS_CONFIG} />,
  }),
  punctuality.accessor("recepcion_folio", {
    header: "Recepción",
    cell: (info) => <span className={FOLIO_CLASS}>{textOrDash(info.getValue())}</span>,
  }),
  punctuality.accessor("oc_folio", {
    header: "OC",
    cell: (info) => <span className={FOLIO_CLASS}>{info.getValue() || `#${info.row.original.oc_id}`}</span>,
  }),
  punctuality.accessor("fecha_recepcion", {
    header: "Fecha de recepción",
    cell: (info) => formatKpiDate(info.getValue()),
  }),
  punctuality.accessor("fecha_entrega_estimada", {
    header: "Fecha prometida",
    cell: (info) => formatKpiDate(info.getValue()),
  }),
] as ColumnDef<SupplierKpiPunctualityRecord>[];

const quality = createColumnHelper<SupplierKpiQualityRecord>();

export const SUPPLIER_QUALITY_COLUMNS = [
  quality.accessor("recepcion_folio", {
    header: "Recepción",
    cell: (info) => <span className={FOLIO_CLASS}>{textOrDash(info.getValue())}</span>,
  }),
  quality.accessor("producto", {
    header: "Producto",
    cell: (info) => textOrDash(info.getValue()),
  }),
  quality.accessor("cantidad_rechazada", {
    header: "Cantidad rechazada",
    meta: { align: "right" },
    cell: (info) => <span className="tabular-nums">{formatQuantityValue(info.getValue())}</span>,
  }),
  quality.accessor("motivo_rechazo", {
    header: "Motivo",
    cell: (info) => textOrDash(info.getValue()),
  }),
] as ColumnDef<SupplierKpiQualityRecord>[];

const fulfillment = createColumnHelper<SupplierKpiFulfillmentRecord>();

export const SUPPLIER_FULFILLMENT_COLUMNS = [
  fulfillment.accessor("folio", {
    header: "OC",
    cell: (info) => <span className={FOLIO_CLASS}>{info.getValue() || `#${info.row.original.oc_id}`}</span>,
  }),
  fulfillment.accessor("unidad", {
    header: "Unidad",
    cell: (info) => info.getValue() || "Sin unidad",
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

const PRICE_BASE_COLUMNS = [
  price.accessor("factura_folio", {
    header: "Factura",
    cell: (info) => <span className={FOLIO_CLASS}>{info.getValue() || `#${info.row.original.factura_id}`}</span>,
  }),
  price.accessor("oc_id", {
    header: "OC",
    cell: (info) => <span className={FOLIO_CLASS}>#{info.getValue()}</span>,
  }),
  price.accessor("producto", {
    header: "Producto",
    cell: (info) => textOrDash(info.getValue()),
  }),
  price.accessor("moneda", {
    header: "Moneda",
  }),
] as ColumnDef<SupplierKpiPriceRecord>[];

const PRICE_AMOUNT_COLUMNS = [
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
  price.accessor(
    (row) =>
      row.precio_facturado === undefined || row.precio_pactado === undefined
        ? undefined
        : // Precios de 2 decimales: la resta se redondea a centavos para no
          // arrastrar el error de punto flotante.
          Math.round((row.precio_facturado - row.precio_pactado) * 100) / 100,
    {
      id: "diferencia",
      header: "Diferencia",
      meta: { align: "right", label: "Diferencia" },
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className="tabular-nums whitespace-nowrap">
            {value === undefined ? "—" : formatKpiTaggedSignedCurrencyAmount(value, info.row.original.moneda)}
          </span>
        );
      },
    },
  ),
] as ColumnDef<SupplierKpiPriceRecord>[];

/**
 * Sin `puede_ver_importes` el backend no manda los precios: las columnas de
 * importe no se pintan (la pestaña lo avisa), el resto de la fila sí.
 */
export const getSupplierPriceColumns = (canSeeAmounts: boolean): ColumnDef<SupplierKpiPriceRecord>[] =>
  canSeeAmounts ? [...PRICE_BASE_COLUMNS, ...PRICE_AMOUNT_COLUMNS] : PRICE_BASE_COLUMNS;
