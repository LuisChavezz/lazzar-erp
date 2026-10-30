import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, BanIcon, CheckCircleIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { CuentaBancaria } from "../interfaces/bank-account.interface";
import { useBankAccountRowActionsContext } from "../hooks/useBankAccountRowActions";
import { formatSaldo } from "../utils/bankAccountMoney";

const columnHelper = createColumnHelper<CuentaBancaria>();

/** Texto con que la fila se nombra: el alias es nullable en el modelo. */
export const getBankAccountLabel = (cuenta: CuentaBancaria): string =>
  cuenta.alias || cuenta.numero_cuenta || `#${cuenta.id}`;

/** Nombre del banco de la fila; `Banco.nombre` es nullable. */
const getBancoLabel = (cuenta: CuentaBancaria): string =>
  cuenta.banco_nombre || `Banco #${cuenta.banco}`;

/**
 * El alias ES el menú de la fila y lleva el punto de `activo`: sin columnas
 * aparte de "Estatus" ni "Acciones". "Ver detalle" abre el resumen de la cuenta.
 * Los callbacks y el "en vuelo" llegan por contexto; los diálogos (resumen,
 * edición y la confirmación) viven en `BankAccountList`: una celda se desmonta
 * al ordenar, filtrar o paginar, y alternar `activo` puede sacar la fila de la
 * vista filtrada.
 *
 * NO hay acción de eliminar: el DELETE del backend es un borrado FÍSICO, no una
 * baja lógica. `activo` es el único control de ciclo de vida.
 */
const BankAccountNameCell = ({ cuenta }: { cuenta: CuentaBancaria }) => {
  const { onViewSummary, onEdit, onToggleActivo, busyIds } = useBankAccountRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(cuenta) },
    {
      label: cuenta.activo ? "Desactivar" : "Activar",
      icon: cuenta.activo ? BanIcon : CheckCircleIcon,
      onSelect: () => onToggleActivo(cuenta),
      disabled: busyIds.includes(cuenta.id),
    },
  ];

  return (
    <FolioActionMenu
      name={getBankAccountLabel(cuenta)}
      detail={{ onSelect: () => onViewSummary(cuenta) }}
      items={items}
      active={cuenta.activo}
    />
  );
};

/**
 * No dependen de nada: callbacks y "en vuelo" llegan al menú por
 * `BankAccountRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = () => {
  const columns = [
    columnHelper.accessor((row) => row.alias ?? "", {
      id: "alias",
      header: "Alias",
      size: 220,
      cell: ({ row }) => <BankAccountNameCell cuenta={row.original} />,
    }),
    // Un solo valor alimenta la celda, la búsqueda global y el orden: el nombre
    // del banco o su respaldo `Banco #N`, el mismo texto que la opción del
    // filtro de encabezado.
    columnHelper.accessor((row) => getBancoLabel(row), {
      id: "banco",
      header: "Banco",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("titular", {
      header: "Titular",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("numero_cuenta", {
      header: "No. de cuenta",
      cell: (info) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("moneda_codigo", {
      header: "Moneda",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("saldo_actual", {
      header: "Saldo actual",
      meta: { align: "right" },
      cell: (info) => (
        // Importe en LA MONEDA DE LA CUENTA, vía `formatSaldo`. El saldo lo
        // mantiene el backend al aplicar pagos y cobros; aquí solo se muestra.
        <div className="tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatSaldo(info.getValue(), info.row.original.moneda_codigo)}
        </div>
      ),
    }),
  ] as ColumnDef<CuentaBancaria>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * - El alias filtra por `activo` (su punto), con ficha "Estatus: …".
 * - El banco es un FK de catálogo, no un enum: sus opciones salen de las filas
 *   (solo los bancos que tienen alguna cuenta), comparan contra el id crudo y
 *   se rotulan con el nombre resuelto, así dos bancos homónimos no se mezclan.
 *   `banco` es obligatorio en el modelo, así que no hay opción "Sin banco".
 */
export const BANK_ACCOUNT_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<CuentaBancaria>>> = {
  alias: { type: "boolean", filterLabel: "estatus", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  banco: { type: "distinct", get: (r) => r.banco, label: getBancoLabel },
};
