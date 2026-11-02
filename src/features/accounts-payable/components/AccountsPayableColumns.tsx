import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { DeleteIcon, ExternalLinkIcon, ViewIcon } from "@/src/components/Icons";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  CXP_ESTATUS_CONFIG,
  CXP_VENCIDA_BADGE_CONFIG,
  CXP_VENCIDA_BADGE_KEY,
} from "../constants/cxpEstatus";
import {
  canDeleteCuentaPorPagar,
  hasAppliedPayments,
  isCuentaPorPagarVencida,
} from "../utils/accounts-payable.utils";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";
import { useAccountsPayableRowActionsContext } from "../hooks/useAccountsPayableRowActions";

const columnHelper = createColumnHelper<CuentaPorPagar>();

/** Texto del proveedor: su nombre resuelto, o `Proveedor #N` si llega vacío. */
const getProveedorLabel = (cuenta: CuentaPorPagar): string =>
  cuenta.proveedor_nombre || `Proveedor #${cuenta.proveedor}`;

/**
 * Vencimiento resaltado con la definición ÚNICA de vencida, la misma del badge
 * y del filtro «Vencida / Al corriente». "Hoy" llega por el contexto del menú.
 */
function VencimientoCell({ cuenta }: { cuenta: CuentaPorPagar }) {
  const { today } = useAccountsPayableRowActionsContext();
  if (!cuenta.fecha_vencimiento) {
    return <span className="text-slate-400 dark:text-slate-600">—</span>;
  }
  const vencida = isCuentaPorPagarVencida(cuenta, today);
  return (
    <span
      className={`whitespace-nowrap tabular-nums ${
        vencida ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      {formatShortDate(cuenta.fecha_vencimiento, { timeZone: "UTC" })}
    </span>
  );
}

/**
 * Celda del identificador: la CxP NO tiene folio propio, así que su `#id` ES el
 * menú de la fila (`FolioActionMenu`, modo folio) y debajo va su estatus, más la
 * marca DERIVADA de vencida cuando aplica (no es un estatus: va junto al badge,
 * nunca en su lugar). "Ver detalle" es siempre la primera acción. Callbacks,
 * "hoy" y "en vuelo" llegan por contexto (`AccountsPayableRowActionsProvider`).
 */
function AccountsPayableIdCell({ cuenta }: { cuenta: CuentaPorPagar }) {
  const { onViewDetail, onDelete, onGoToPayments, today, busyIds } =
    useAccountsPayableRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(cuenta) },
  ];
  if (canDeleteCuentaPorPagar(cuenta)) {
    items.push({
      label: "Eliminar cuenta",
      icon: DeleteIcon,
      onSelect: () => onDelete(cuenta),
      disabled: busyIds.includes(cuenta.id),
    });
  } else if (hasAppliedPayments(cuenta)) {
    // Eliminar queda OCULTO con pagos aplicados (el backend respondería 400); en
    // su lugar se dice qué hacer y se lleva a Pagos. Una cuenta `Cancelada` sin
    // pagos no recibe esta pista: no es el motivo.
    items.push({
      label: "Cancela los pagos aplicados primero",
      icon: ExternalLinkIcon,
      onSelect: onGoToPayments,
    });
  }

  const vencida = isCuentaPorPagarVencida(cuenta, today);
  return (
    <FolioActionMenu
      folio={`#${cuenta.id}`}
      items={items}
      status={
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={cuenta.estatus} config={CXP_ESTATUS_CONFIG} />
          {vencida && (
            <StatusBadge status={CXP_VENCIDA_BADGE_KEY} config={CXP_VENCIDA_BADGE_CONFIG} />
          )}
        </div>
      }
    />
  );
}

/**
 * Columnas del listado de cuentas por pagar. No reciben nada: callbacks, "hoy"
 * y "en vuelo" llegan al menú por `AccountsPayableRowActionsProvider`, así una
 * acción no remonta las celdas. La única que necesita "hoy" fuera del menú es
 * el resaltado del vencimiento, que lo lee del mismo contexto.
 *
 * La CxP NO tiene folio propio en el contrato: el identificador visible es el
 * `id`, y el folio que se muestra aparte es el de su factura de proveedor.
 *
 * Las columnas nullables (`proveedor_nombre`, `factura_proveedor_folio`,
 * `fecha_vencimiento`) usan un `accessorFn` que colapsa `null` a `''`: la
 * búsqueda global decide si una columna es filtrable mirando el valor de la
 * primera fila, y un `null` ahí la dejaba fuera de la búsqueda (mismo caso que
 * documenta `ProductionOrderColumns`).
 *
 * Los diálogos de detalle y de borrado se montan en `AccountsPayableList`, no
 * aquí: una celda se desmonta al ordenar, filtrar o paginar, y el borrado
 * optimista saca la fila de la tabla.
 */
export const getColumns = () =>
  [
    columnHelper.accessor("id", {
      header: "CxP",
      size: 170,
      cell: (info) => <AccountsPayableIdCell cuenta={info.row.original} />,
    }),
    // Mismo texto en la celda, la búsqueda y la opción del filtro.
    columnHelper.accessor((row) => getProveedorLabel(row), {
      id: "proveedor_nombre",
      header: "Proveedor",
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.factura_proveedor_folio ?? "", {
      id: "factura_proveedor_folio",
      header: "Factura",
      cell: (info) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {info.getValue() || `#${info.row.original.factura_proveedor}`}
        </span>
      ),
    }),
    columnHelper.accessor("fecha_emision", {
      header: "Emisión",
      cell: (info) => (
        // `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD" — sin esto un
        // navegador al oeste de Greenwich pinta el día anterior.
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
          {formatShortDate(info.getValue(), { timeZone: "UTC" })}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.fecha_vencimiento ?? "", {
      id: "fecha_vencimiento",
      header: "Vencimiento",
      cell: (info) => <VencimientoCell cuenta={info.row.original} />,
    }),
    columnHelper.accessor("total", {
      header: "Total",
      meta: { align: "right" },
      cell: (info) => (
        // En la moneda de la FACTURA; sin moneda resuelta, sin símbolo.
        <div className="tabular-nums text-slate-600 dark:text-slate-300">
          {formatMoneyValueOrDash(
            info.getValue(),
            info.row.original.moneda_codigo,
          )}
        </div>
      ),
    }),
    columnHelper.accessor("saldo", {
      header: "Saldo",
      meta: { align: "right" },
      cell: (info) => (
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatMoneyValueOrDash(
            info.getValue(),
            info.row.original.moneda_codigo,
          )}
        </div>
      ),
    }),
  ] as ColumnDef<CuentaPorPagar>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Se arman con "hoy" porque la vencida es DERIVADA:
 * - El `#id` filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo y, al final, cada valor desconocido de las filas, crudo.
 * - El proveedor es un FK: sus opciones salen de las filas, comparan contra el
 *   id crudo y se rotulan con el nombre (o `Proveedor #N`), con buscador; dos
 *   homónimos no se mezclan. Es obligatorio en el modelo: no hay "Sin proveedor".
 * - La emisión filtra por mes.
 * - El vencimiento filtra «Vencida / Al corriente» con `isCuentaPorPagarVencida`,
 *   la misma regla que pinta la marca (reemplaza al botón "Solo vencidas"). Una
 *   cuenta sin vencimiento, pagada o cancelada cuenta como al corriente.
 */
export const getAccountsPayableHeaderFilters = (
  today: string,
): Partial<Record<string, HeaderFilterSpec<CuentaPorPagar>>> => ({
  id: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(CXP_ESTATUS_CONFIG),
  },
  proveedor_nombre: { type: "distinct", get: (r) => r.proveedor, label: getProveedorLabel, searchable: true },
  fecha_emision: { type: "month", get: (r) => r.fecha_emision },
  fecha_vencimiento: {
    type: "boolean",
    get: (r) => isCuentaPorPagarVencida(r, today),
    yes: "Vencida",
    no: "Al corriente",
  },
});
