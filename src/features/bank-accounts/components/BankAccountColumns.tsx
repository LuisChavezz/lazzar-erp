import { ColumnDef, createColumnHelper, FilterFn, Row } from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import { EditIcon, BanIcon, CheckCircleIcon, ChevronRightIcon, ViewIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG } from "@/src/components/StatusBadge";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { CuentaBancaria } from "../interfaces/bank-account.interface";
import { useToggleBankAccountActivo } from "../hooks/useToggleBankAccountActivo";
import { formatSaldo } from "../utils/bankAccountMoney";

const columnHelper = createColumnHelper<CuentaBancaria>();

const ACTIVO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Activo", dotClassName: ACTIVO_INACTIVO_CFG.activo.dot },
  { value: "false", label: "Inactivo", dotClassName: ACTIVO_INACTIVO_CFG.inactivo.dot },
];

const activoFilterFn: FilterFn<CuentaBancaria> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.activo) === filterValue;
};

const bancoFilterFn: FilterFn<CuentaBancaria> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.banco) === filterValue;
};

/**
 * Celda de acciones.
 *
 * "Ver resumen" solo INVOCA el callback: el diálogo se monta en
 * `BankAccountList`, no aquí. Una celda se desmonta al ordenar, filtrar o
 * paginar —y `activo` puede alternarse con el resumen abierto, lo que reordena
 * la tabla—, así que un diálogo montado en la celda desaparecería a media
 * interacción.
 *
 * NO hay acción de eliminar: el DELETE del backend es un borrado FÍSICO, no una
 * baja lógica. `activo` es el único control de ciclo de vida.
 */
const ActionsCell = ({
  row,
  onEdit,
  onViewSummary,
  trigger,
}: {
  row: Row<CuentaBancaria>;
  onEdit: (cuenta: CuentaBancaria) => void;
  onViewSummary: (id: number) => void;
  trigger: ReactNode;
}) => {
  const { mutate: toggleActivo, isPending } = useToggleBankAccountActivo();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { activo } = row.original;
  const nextActivo = !activo;

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver resumen",
      icon: ViewIcon,
      onSelect: () => onViewSummary(row.original.id),
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(row.original),
    },
    {
      label: activo ? "Desactivar" : "Activar",
      icon: activo ? BanIcon : CheckCircleIcon,
      onSelect: () => setIsConfirmOpen(true),
      disabled: isPending,
    },
  ];

  return (
    <>
      <ActionMenu items={menuItems} align="start" trigger={trigger} />
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={activo ? "Desactivar Cuenta Bancaria" : "Activar Cuenta Bancaria"}
        description={
          activo
            ? "¿Deseas desactivar esta cuenta? Su información y sus movimientos se conservan, y seguirá visible en el listado con estatus Inactivo."
            : "¿Deseas activar esta cuenta? Volverá a estar disponible para su uso."
        }
        // Sin etiqueta de "pendiente": `closeOnConfirm` vale true por defecto y
        // `onConfirm` cierra el diálogo en el acto, así que `isPending` solo se
        // vuelve true cuando este texto ya no está montado — la rama era
        // inalcanzable (`ConfirmDialog` documenta la trampa en ese prop). El
        // doble envío sigue cubierto por `disabled: isPending` en el menú.
        confirmText={activo ? "Desactivar" : "Activar"}
        onConfirm={() => {
          toggleActivo({ id: row.original.id, activo: nextActivo });
          setIsConfirmOpen(false);
        }}
        // `ConfirmDialog` usa la paleta de Radix: "green", no "emerald".
        confirmColor={activo ? "amber" : "green"}
      />
    </>
  );
};

export const getColumns = (
  onEdit: (cuenta: CuentaBancaria) => void,
  onViewSummary: (id: number) => void,
  // Opciones del filtro de encabezado de "Banco" — se omite (columna sin
  // ícono de filtro) mientras no haya bancos cargados: ver `BankAccountList`.
  bancoFilterOptions: ColumnFilterOption[] = [],
) => {
  const columns = [
    columnHelper.accessor("alias", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Alias</span>
          <ColumnHeaderFilter column={column} options={ACTIVO_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      filterFn: activoFilterFn,
      cell: (info) => {
        const cuenta = info.row.original;
        const statusCfg = cuenta.activo ? ACTIVO_INACTIVO_CFG.activo : ACTIVO_INACTIVO_CFG.inactivo;
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg.dot}`} title={statusCfg.label} aria-hidden="true" />
            <span className="sr-only">{statusCfg.label}</span>
            <ActionsCell
              row={info.row}
              onEdit={onEdit}
              onViewSummary={onViewSummary}
              trigger={
                <button type="button" title="Ver acciones" className="group inline-flex items-center gap-1 cursor-pointer">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                    {info.getValue() || "—"}
                  </span>
                  <ChevronRightIcon
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </button>
              }
            />
          </div>
        );
      },
    }),
    columnHelper.accessor("banco_nombre", {
      header: ({ column }) =>
        bancoFilterOptions.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <span>Banco</span>
            <ColumnHeaderFilter column={column} options={bancoFilterOptions} label="banco" />
          </div>
        ) : (
          "Banco"
        ),
      filterFn: bancoFilterFn,
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
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
