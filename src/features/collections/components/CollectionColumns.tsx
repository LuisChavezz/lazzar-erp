import { ColumnDef, createColumnHelper, FilterFn } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ChevronRightIcon, ShieldCheckIcon, ViewIcon } from "@/src/components/Icons";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  COBRO_ESTATUS_CONFIG,
  COBRO_METODO_PAGO_CONFIG,
  COBRO_REFERENCIA_LABELS,
} from "../constants/collectionStatus";
import { cobroLabel, type CobroRow } from "../utils/collection.utils";
import { useCollectionRowActionsContext } from "../hooks/useCollectionRowActions";
import { CobroAmount } from "./CobroAmount";
import { CobroRepState, getCobroRepStateLabel } from "./CobroRepState";

const columnHelper = createColumnHelper<CobroRow>();

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

const estatusFilterFn: FilterFn<CobroRow> = (row, _columnId, filterValue) =>
  filterValue === undefined || row.original.estatus === filterValue;

const metodoFilterFn: FilterFn<CobroRow> = (row, _columnId, filterValue) =>
  filterValue === undefined || row.original.metodo_pago === filterValue;

interface CollectionColumnsCallbacks {
  onViewDetail: (id: number) => void;
}

/**
 * Primera columna: punto de estatus y el folio (`#id` sin folio, ver
 * `cobroLabel`). El identificador con su chevron es el
 * disparador del menú de la fila, mismo patrón y markup que `FolioCell` de
 * `InvoiceColumns` (Facturación): un clic en cualquier parte abre el menú.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos se montan en
 * `CollectionList`, no aquí, porque una celda se desmonta al ordenar, filtrar o
 * paginar. "Timbrar REP" llega por `CollectionRowActionsProvider` (depende de
 * la sesión: pasarla por la factoría remontaría las celdas al resolverse).
 * Cancelar (EC-544) se agregará como otra entrada de `menuItems`.
 */
const CobroIdCell = ({ cobro, onViewDetail }: { cobro: CobroRow } & CollectionColumnsCallbacks) => {
  const { canStampRep, onStampRep } = useCollectionRowActionsContext();
  const statusCfg = COBRO_ESTATUS_CONFIG[cobro.estatus];
  const statusLabel = statusCfg?.label ?? cobro.estatus;
  const label = cobroLabel(cobro);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(cobro.id) },
    {
      label: "Timbrar REP",
      icon: ShieldCheckIcon,
      onSelect: () => onStampRep(cobro.id),
      visible: canStampRep(cobro),
    },
  ];

  return (
    <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
      {/* Indicador, fuera del botón: no es parte de la acción. */}
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${statusCfg?.dot ?? "bg-slate-400"}`}
        role="img"
        aria-label={statusLabel}
        title={statusLabel}
      />
      <ActionMenu
        items={menuItems}
        ariaLabel={`Acciones del cobro ${label}`}
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones del cobro ${label}`}
            title="Ver detalle"
            className="group inline-flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
          >
            {label}
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
    </div>
  );
};

/**
 * Columnas del listado de cobros.
 *
 * El identificador visible es el `folio` de la serie `COBROS`, o `#id` mientras
 * no tenga (`cobroLabel`); la columna busca por ese texto y ordena por `id`.
 *
 * Estatus y acciones van en la primera columna (no hay columnas "Estatus" ni
 * "Acciones"), con el filtro de estatus en su encabezado: estándar de tablas de
 * la app (ver `CobroIdCell`).
 *
 * Los campos nullable que participan en la búsqueda global se colapsan a `""`
 * en el accessor (ver la nota de `getColumnCanGlobalFilter` en `DataTable`).
 */
export const getCollectionColumns = ({ onViewDetail }: CollectionColumnsCallbacks) =>
  [
    // Accessor de TEXTO para que la búsqueda global encuentre el folio; el orden
    // sigue siendo por `id` (el folio es nulo en borradores sin líneas).
    columnHelper.accessor((row) => cobroLabel(row), {
      id: "id",
      sortingFn: (a, b) => a.original.id - b.original.id,
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Cobro</span>
          <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      meta: { label: "Cobro" },
      // Cabe un folio "COB-00000" con su chevron y el punto de estatus.
      size: 130,
      filterFn: estatusFilterFn,
      cell: (info) => <CobroIdCell cobro={info.row.original} onViewDetail={onViewDetail} />,
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
        safeParseAmount(a.original.total_cobrado) - safeParseAmount(b.original.total_cobrado),
      cell: (info) => (
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          <span className="whitespace-nowrap">
            <CobroAmount value={info.getValue()} moneda={info.row.original.moneda_codigo} />
          </span>
        </div>
      ),
    }),
    columnHelper.accessor((row) => getCobroRepStateLabel(row), {
      id: "rep",
      header: "REP",
      size: 90,
      meta: { label: "REP", align: "center" },
      cell: (info) => <CobroRepState cobro={info.row.original} />,
    }),
  ] as ColumnDef<CobroRow>[];
