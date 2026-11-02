import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { ShieldCheckIcon, ViewIcon } from "@/src/components/Icons";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
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

/** Texto del cliente: su nombre resuelto, o `Cliente #N` si llega vacío. */
const getClienteLabel = (cobro: CobroRow): string =>
  cobro.cliente_nombre || `Cliente #${cobro.cliente}`;

/** Texto de la cuenta bancaria: su alias (nullable), o `Cuenta #N`. */
const getCuentaLabel = (cobro: CobroRow): string =>
  cobro.cuenta_bancaria_alias || `Cuenta #${cobro.cuenta_bancaria}`;

/**
 * Primera columna: el folio (`#id` sin folio, ver `cobroLabel`) ES el menú de la
 * fila (`FolioActionMenu`) y debajo va su estatus. "Ver detalle" es siempre la
 * primera acción.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos se montan en
 * `CollectionList`, no aquí, porque una celda se desmonta al ordenar, filtrar o
 * paginar. Callbacks y "Timbrar REP" (que depende de la sesión) llegan por
 * `CollectionRowActionsProvider`: pasarlos por la factoría remontaría las
 * celdas.
 */
function CobroIdCell({ cobro }: { cobro: CobroRow }) {
  const { onViewDetail, canStampRep, onStampRep } = useCollectionRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(cobro) },
    {
      label: "Timbrar REP",
      icon: ShieldCheckIcon,
      onSelect: () => onStampRep(cobro.id),
      visible: canStampRep(cobro),
    },
  ];

  return (
    <FolioActionMenu
      folio={cobroLabel(cobro)}
      items={items}
      status={<StatusBadge status={cobro.estatus} config={COBRO_ESTATUS_CONFIG} />}
    />
  );
}

/**
 * Columnas del listado de cobros.
 *
 * El identificador visible es el `folio` de la serie `COBROS`, o `#id` mientras
 * no tenga (`cobroLabel`); la columna busca por folio y por `#id`, y ordena por `id`.
 *
 * Estatus y acciones van en la primera columna (no hay columnas "Estatus" ni
 * "Acciones"): estándar de tablas de la app (ver `CobroIdCell`). Los filtros de
 * encabezado los agrega `withHeaderFilters` (`getCollectionHeaderFilters`).
 *
 * Los campos nullable que participan en la búsqueda global se colapsan a `""`
 * en el accessor (ver la nota de `getColumnCanGlobalFilter` en `DataTable`).
 */
export const getCollectionColumns = () =>
  [
    // Accessor de TEXTO para que la búsqueda global encuentre el folio y también
    // `#id`, con el que el movimiento bancario y la póliza nombran al cobro. La
    // celda muestra `cobroLabel` y el orden sigue siendo por `id`.
    columnHelper.accessor((row) => `${row.folio ?? ""} #${row.id}`, {
      id: "id",
      sortingFn: (a, b) => a.original.id - b.original.id,
      header: "Cobro",
      // Cabe un folio "COB-00000" con su chevron; el estatus va debajo.
      size: 140,
      cell: (info) => <CobroIdCell cobro={info.row.original} />,
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
    // Mismo texto en la celda, la búsqueda y la opción del filtro.
    columnHelper.accessor((row) => getClienteLabel(row), {
      id: "cliente_nombre",
      header: "Cliente",
      size: 170,
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getCuentaLabel(row), {
      id: "cuenta_bancaria_alias",
      size: 150,
      header: "Cuenta bancaria",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("metodo_pago", {
      header: "Método",
      size: 130,
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
      size: 100,
      meta: { label: "REP", align: "center" },
      cell: (info) => <CobroRepState cobro={info.row.original} />,
    }),
  ] as ColumnDef<CobroRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`:
 * - El folio filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo de `COBRO_ESTATUS_CONFIG` y, al final, cada valor
 *   desconocido de las filas, crudo.
 * - Cliente y cuenta bancaria son FKs: sus opciones salen de las filas,
 *   comparan contra el id crudo y se rotulan con el nombre o alias (o
 *   `Cliente #N` / `Cuenta #N`), con buscador; dos homónimos no se mezclan. Los
 *   dos son obligatorios en el modelo: no hay opción "Sin …".
 * - El método: el catálogo completo de `COBRO_METODO_PAGO_CONFIG`, que cubre el
 *   enum `MetodoPago` compartido con Pagos.
 */
export const getCollectionHeaderFilters = (): Partial<
  Record<string, HeaderFilterSpec<CobroRow>>
> => ({
  id: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(COBRO_ESTATUS_CONFIG),
  },
  cliente_nombre: { type: "distinct", get: (r) => r.cliente, label: getClienteLabel, searchable: true },
  cuenta_bancaria_alias: {
    type: "distinct",
    get: (r) => r.cuenta_bancaria,
    label: getCuentaLabel,
    searchable: true,
  },
  metodo_pago: {
    type: "options",
    filterLabel: "método de pago",
    get: (r) => r.metodo_pago,
    options: optionsFromConfig(COBRO_METODO_PAGO_CONFIG),
  },
});
