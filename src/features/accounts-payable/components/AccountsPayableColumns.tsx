import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { DeleteIcon, ExternalLinkIcon, ViewIcon } from "@/src/components/Icons";
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
  moneyFormatFor,
} from "../utils/accounts-payable.utils";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";

const columnHelper = createColumnHelper<CuentaPorPagar>();

interface AccountsPayableColumnsOptions {
  /** "Hoy" en la zona del backend, calculado UNA vez por la vista. */
  today: string;
  onViewDetail: (id: number) => void;
  onDelete: (id: number) => void;
  onGoToPayments: () => void;
}

/**
 * Columnas del listado de cuentas por pagar.
 *
 * La CxP NO tiene folio propio en el contrato: el identificador visible es el
 * `id`, y el folio que se muestra aparte es el de su factura de proveedor.
 *
 * Las columnas nullables (`proveedor_nombre`, `factura_proveedor_folio`,
 * `fecha_vencimiento`) usan un `accessorFn` que colapsa `null` a `''`: la
 * búsqueda global decide si una columna es filtrable mirando el valor de la
 * primera fila, y un `null` ahí la dejaba fuera de la búsqueda (mismo caso que
 * documenta `ProductionOrderColumns`). El `id` explícito conserva el orden y la
 * visibilidad de columnas que guarda `DataTable`.
 *
 * Las acciones solo INVOCAN callbacks: los diálogos de detalle y de borrado se
 * montan en `AccountsPayableList`, no aquí. Una celda se desmonta al ordenar,
 * filtrar o paginar, y el borrado optimista saca la fila de la tabla.
 */
export const getColumns = ({
  today,
  onViewDetail,
  onDelete,
  onGoToPayments,
}: AccountsPayableColumnsOptions) =>
  [
    columnHelper.accessor("id", {
      header: "CxP",
      cell: (info) => (
        <button
          type="button"
          onClick={() => onViewDetail(info.row.original.id)}
          title="Ver detalle"
          className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {`#${info.getValue()}`}
        </button>
      ),
    }),
    columnHelper.accessor((row) => row.proveedor_nombre ?? "", {
      id: "proveedor_nombre",
      header: "Proveedor",
      cell: (info) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {info.getValue() || "—"}
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
      cell: (info) => {
        const value = info.getValue();
        if (!value) {
          return <span className="text-slate-400 dark:text-slate-600">—</span>;
        }
        // Resaltado con la definición ÚNICA de vencida, la misma del badge y del
        // filtro "Solo vencidas".
        const vencida = isCuentaPorPagarVencida(info.row.original, today);
        return (
          <span
            className={`whitespace-nowrap tabular-nums ${
              vencida
                ? "text-red-600 dark:text-red-400 font-semibold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {formatShortDate(value, { timeZone: "UTC" })}
          </span>
        );
      },
    }),
    columnHelper.accessor("total", {
      header: "Total",
      cell: (info) => (
        // En la moneda de la FACTURA; sin moneda resuelta, sin símbolo.
        <div className="tabular-nums text-slate-600 dark:text-slate-300">
          {formatMoneyValueOrDash(
            info.getValue(),
            moneyFormatFor(info.row.original.moneda_codigo),
          )}
        </div>
      ),
    }),
    columnHelper.accessor("saldo", {
      header: "Saldo",
      cell: (info) => (
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatMoneyValueOrDash(
            info.getValue(),
            moneyFormatFor(info.row.original.moneda_codigo),
          )}
        </div>
      ),
    }),
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={info.getValue()} config={CXP_ESTATUS_CONFIG} />
          {/* Marca DERIVADA, junto al estatus y nunca en su lugar: una cuenta
              vencida sigue siendo `Pendiente` o `Parcial`. */}
          {isCuentaPorPagarVencida(info.row.original, today) && (
            <StatusBadge
              status={CXP_VENCIDA_BADGE_KEY}
              config={CXP_VENCIDA_BADGE_CONFIG}
            />
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const cuenta = row.original;
        const menuItems: ActionMenuItem[] = [
          {
            label: "Ver detalle",
            icon: ViewIcon,
            onSelect: () => onViewDetail(cuenta.id),
          },
        ];

        if (canDeleteCuentaPorPagar(cuenta)) {
          menuItems.push({
            label: "Eliminar cuenta",
            icon: DeleteIcon,
            onSelect: () => onDelete(cuenta.id),
          });
        } else if (hasAppliedPayments(cuenta)) {
          // Eliminar queda OCULTO con pagos aplicados (el backend respondería
          // 400); en su lugar se dice qué hacer y se lleva a Pagos. Una cuenta
          // `Cancelada` sin pagos no recibe esta pista: no es el motivo.
          menuItems.push({
            label: "Cancela los pagos aplicados primero",
            icon: ExternalLinkIcon,
            onSelect: onGoToPayments,
          });
        }

        return (
          <div className="flex justify-center">
            <ActionMenu
              items={menuItems}
              ariaLabel={`Acciones de la cuenta por pagar #${cuenta.id}`}
            />
          </div>
        );
      },
    }),
  ] as ColumnDef<CuentaPorPagar>[];
