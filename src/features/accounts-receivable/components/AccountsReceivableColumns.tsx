"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { CXC_ESTATUS_CONFIG } from "../constants/cxcEstatus";
import type { CuentaPorCobrarRow } from "../interfaces/accounts-receivable.interface";
import { useAccountsReceivableRowActionsContext } from "../hooks/useAccountsReceivableRowActions";

// ── Folio: menú de la fila ────────────────────────────────────────────────────

/**
 * Celda del folio: el folio ES el menú de la fila (`FolioActionMenu`) y debajo
 * va su estatus —reemplaza las columnas aparte "Estatus" y "Acciones"—. "Ver
 * detalle" es siempre la primera acción. El callback llega por contexto
 * (`AccountsReceivableRowActionsProvider`), no por la factoría de columnas.
 *
 * "Registrar cobro" y "Ver factura" vivían en el menú con `onSelect: () => {}`:
 * se ofrecían y no hacían nada. Se retiraron hasta que exista la
 * funcionalidad — un menú que miente es peor que uno corto. Al reponerlas,
 * "Registrar cobro" solo aplica con saldo pendiente (estatus distinto de
 * "Pagada" y "Cancelada") y necesitará su código de permiso.
 */
function AccountsReceivableFolioCell({ cuenta }: { cuenta: CuentaPorCobrarRow }) {
  const { onViewDetail } = useAccountsReceivableRowActionsContext();
  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(cuenta) },
  ];
  return (
    <FolioActionMenu
      folio={cuenta.folio_cxc}
      items={items}
      // La config vive en `constants/cxcEstatus.ts`: la usan también el detalle
      // y el seguimiento de la factura.
      status={<StatusBadge status={cuenta.estatus} config={CXC_ESTATUS_CONFIG} />}
    />
  );
}

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<CuentaPorCobrarRow>();

/** Texto del cliente: su nombre resuelto, o `Cliente #N` si llega vacío. */
const getClienteLabel = (cuenta: CuentaPorCobrarRow): string =>
  cuenta.cliente_nombre || `Cliente #${cuenta.cliente}`;

/**
 * Columnas del listado de CxC. No reciben nada: el callback del menú llega por
 * `AccountsReceivableRowActionsProvider`, así una acción no remonta las celdas.
 * El diálogo de detalle NO vive en una celda (las celdas se desmontan al
 * ordenar, paginar o filtrar): lo abre `AccountsReceivableList`.
 */
export const getAccountsReceivableColumns = () => [
  columnHelper.accessor("folio_cxc", {
    header: "Folio CxC",
    size: 170,
    cell: (info) => <AccountsReceivableFolioCell cuenta={info.row.original} />,
  }),
  // Mismo texto en la celda, la búsqueda y la opción del filtro.
  columnHelper.accessor((row) => getClienteLabel(row), {
    id: "cliente_nombre",
    header: "Cliente",
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("factura_folio", {
    header: "Factura",
    cell: (info) => (
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("fecha_emision", {
    header: "Emisión",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatShortDate(info.getValue(), { timeZone: "UTC" })}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.fecha_vencimiento ?? "", {
    id: "fecha_vencimiento",
    header: "Vencimiento",
    cell: (info) => {
      // El resaltado de vencido usa la definición única `esta_vencida` (por
      // fecha), la MISMA que el KPI, la antigüedad y la columna "Días venc.".
      const overdue = info.row.original.esta_vencida;
      return (
        <span
          className={`tabular-nums ${
            overdue
              ? "text-red-600 dark:text-red-400 font-semibold"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {formatShortDate(info.getValue(), { timeZone: "UTC" })}
        </span>
      );
    },
  }),
  columnHelper.accessor("total", {
    header: "Monto",
    meta: { align: "right" },
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatMoneyValue(
          info.getValue(),
          // Cada cuenta en la moneda de SU factura.
          info.row.original.moneda_codigo,
        )}
      </span>
    ),
  }),
  columnHelper.accessor("saldo", {
    header: "Saldo",
    meta: { align: "right" },
    cell: (info) => (
      <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
        {formatMoneyValue(
          info.getValue(),
          info.row.original.moneda_codigo,
        )}
      </span>
    ),
  }),
  columnHelper.accessor("dias_vencido", {
    header: "Días venc.",
    cell: (info) => {
      // Se muestran los días de atraso cuando la cuenta está vencida según la
      // definición única `esta_vencida` (misma que el KPI "Vencido" y la
      // antigüedad): una vencida tiene al menos 1 día de atraso. "—" queda para
      // las NO vencidas (Pagada, Cancelada, sin fecha o que vencen hoy o después).
      const dias = info.getValue();
      return info.row.original.esta_vencida ? (
        <span className="text-red-600 dark:text-red-400 font-semibold tabular-nums">{dias}</span>
      ) : (
        <span className="text-slate-400 dark:text-slate-600">—</span>
      );
    },
  }),
] as ColumnDef<CuentaPorCobrarRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Reemplazan los chips de `filterConfig` (EC-677), con la misma forma que CxP:
 * - El folio filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo de `CXC_ESTATUS_CONFIG` y, al final, cada valor
 *   desconocido de las filas, crudo.
 * - El cliente es un FK: sus opciones salen de las filas, comparan contra el id
 *   crudo y se rotulan con el nombre (o `Cliente #N`), con buscador; dos
 *   homónimos no se mezclan. Es obligatorio en el modelo: no hay "Sin cliente".
 * - El vencimiento filtra «Vencida / Al corriente» con `esta_vencida`, la misma
 *   regla (`isCuentaVencida`) que el resaltado, los KPIs y la antigüedad. Una
 *   cuenta sin vencimiento, pagada o cancelada cuenta como al corriente.
 *
 * Filtrar NO toca los KPIs, la alerta ni la antigüedad: se calculan sobre el
 * listado completo en `AccountsReceivableList`, no sobre las filas filtradas.
 */
export const getAccountsReceivableHeaderFilters = (): Partial<
  Record<string, HeaderFilterSpec<CuentaPorCobrarRow>>
> => ({
  folio_cxc: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(CXC_ESTATUS_CONFIG),
  },
  cliente_nombre: { type: "distinct", get: (r) => r.cliente, label: getClienteLabel, searchable: true },
  fecha_vencimiento: {
    type: "boolean",
    get: (r) => r.esta_vencida,
    yes: "Vencida",
    no: "Al corriente",
  },
});
