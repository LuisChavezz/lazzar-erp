import { ColumnDef, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ViewIcon } from "@/src/components/Icons";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  COBRO_ESTATUS_CONFIG,
  COBRO_METODO_PAGO_CONFIG,
  COBRO_REFERENCIA_LABELS,
} from "../constants/collectionStatus";
import type { Cobro } from "../interfaces/collection.interface";
import { CobroAmount } from "./CobroAmount";

const columnHelper = createColumnHelper<Cobro>();

// Opciones construidas desde los enums COMPLETOS: un valor nuevo del backend
// obliga a tocar la config (typecheck) y aparece solo en el filtro.
const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(COBRO_ESTATUS_CONFIG).map(([estatus, cfg]) => ({
    value: estatus,
    label: cfg.label ?? estatus,
    dotClassName: cfg.dot,
  })),
];

const METODO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(COBRO_METODO_PAGO_CONFIG).map(([metodo, cfg]) => ({
    value: metodo,
    label: cfg.label ?? metodo,
    dotClassName: cfg.dot,
  })),
];

const estatusFilterFn: FilterFn<Cobro> = (row, _columnId, filterValue) =>
  filterValue === undefined || row.original.estatus === filterValue;

const metodoFilterFn: FilterFn<Cobro> = (row, _columnId, filterValue) =>
  filterValue === undefined || row.original.metodo_pago === filterValue;

interface CollectionColumnsCallbacks {
  onViewDetail: (id: number) => void;
}

/**
 * Columnas del listado de cobros.
 *
 * El cobro NO tiene folio propio en el contrato, así que el identificador
 * visible es el `id` (`#123`).
 *
 * Las acciones solo INVOCAN callbacks: los diálogos se montan en
 * `CollectionList`, no aquí, porque una celda se desmonta al ordenar, filtrar o
 * paginar. Cancelar (EC-544) y timbrar el REP (EC-527) se agregan como entradas
 * del menú de "Acciones" con su callback en `CollectionColumnsCallbacks`.
 *
 * Los campos nullable que participan en la búsqueda global se colapsan a `""`
 * en el accessor (ver la nota de `getColumnCanGlobalFilter` en `DataTable`).
 */
export const getCollectionColumns = ({ onViewDetail }: CollectionColumnsCallbacks) =>
  [
    columnHelper.accessor("id", {
      header: "Cobro",
      size: 80,
      cell: (info) => (
        <button
          type="button"
          title="Ver detalle"
          onClick={() => onViewDetail(info.getValue())}
          className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {`#${info.getValue()}`}
        </button>
      ),
    }),
    columnHelper.accessor("fecha_cobro", {
      header: "Fecha",
      size: 100,
      cell: (info) => (
        // `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD" — sin esto un
        // navegador al oeste de Greenwich pinta el día anterior.
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
          {formatShortDate(info.getValue(), { timeZone: "UTC" })}
        </span>
      ),
    }),
    columnHelper.accessor("cliente_nombre", {
      header: "Cliente",
      size: 170,
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.cuenta_bancaria_alias ?? "", {
      id: "cuenta_bancaria_alias",
      size: 150,
      header: "Cuenta bancaria",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("metodo_pago", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Método</span>
          <ColumnHeaderFilter column={column} options={METODO_FILTER_OPTIONS} label="método de pago" />
        </div>
      ),
      size: 130,
      meta: { label: "Método" },
      filterFn: metodoFilterFn,
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={COBRO_METODO_PAGO_CONFIG} />
      ),
    }),
    // Un solo string con la referencia (enum) y la operación (texto libre) para
    // que la búsqueda global encuentre cualquiera de las dos.
    columnHelper.accessor(
      (row) => `${COBRO_REFERENCIA_LABELS[row.referencia] ?? row.referencia} ${row.referencia_operacion ?? ""}`.trim(),
      {
        id: "referencia",
        header: "Referencia",
        size: 150,
        cell: (info) => {
          const cobro = info.row.original;
          return (
            <div className="flex flex-col">
              <span className="text-slate-600 dark:text-slate-300">
                {COBRO_REFERENCIA_LABELS[cobro.referencia] ?? cobro.referencia}
              </span>
              {cobro.referencia_operacion && (
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {cobro.referencia_operacion}
                </span>
              )}
            </div>
          );
        },
      },
    ),
    columnHelper.accessor("total_cobrado", {
      header: "Total",
      size: 130,
      meta: { align: "right" },
      sortingFn: (a, b) =>
        Number(a.original.total_cobrado) - Number(b.original.total_cobrado),
      cell: (info) => (
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          <CobroAmount
            value={info.getValue()}
            cuentaBancariaId={info.row.original.cuenta_bancaria}
          />
        </div>
      ),
    }),
    columnHelper.accessor("estatus", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Estatus</span>
          <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      size: 110,
      meta: { label: "Estatus", align: "center" },
      filterFn: estatusFilterFn,
      cell: (info) => (
        <div className="flex justify-center">
          <StatusBadge status={info.getValue()} config={COBRO_ESTATUS_CONFIG} />
        </div>
      ),
    }),
    columnHelper.accessor((row) => (row.rep_uuid ? "Timbrado" : row.rep_pendiente ? "Pendiente" : ""), {
      id: "rep",
      header: "REP",
      size: 90,
      meta: { label: "REP", align: "center" },
      cell: (info) => {
        const value = info.getValue();
        if (!value) return <span className="text-slate-400">—</span>;
        return (
          <span
            className={`text-xs font-medium ${
              value === "Timbrado"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
            title={value === "Pendiente" ? "Timbrado sin confirmar en Facturama" : undefined}
          >
            {value}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "acciones",
      header: "Acciones",
      size: 80,
      meta: { align: "center" },
      enableHiding: false,
      cell: (info) => {
        const cobro = info.row.original;
        const menuItems: ActionMenuItem[] = [
          { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(cobro.id) },
        ];
        return (
          <div className="flex items-center justify-center">
            <ActionMenu items={menuItems} ariaLabel={`Acciones del cobro #${cobro.id}`} />
          </div>
        );
      },
    }),
  ] as ColumnDef<Cobro>[];
