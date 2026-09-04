import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, BanIcon, CheckCircleIcon, ViewIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { CuentaBancaria } from "../interfaces/bank-account.interface";
import { useToggleBankAccountActivo } from "../hooks/useToggleBankAccountActivo";
import { formatSaldo } from "../utils/bankAccountMoney";

const columnHelper = createColumnHelper<CuentaBancaria>();

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
}: {
  row: Row<CuentaBancaria>;
  onEdit: (cuenta: CuentaBancaria) => void;
  onViewSummary: (id: number) => void;
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
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
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
    </div>
  );
};

export const getColumns = (
  onEdit: (cuenta: CuentaBancaria) => void,
  onViewSummary: (id: number) => void
) => {
  const columns = [
    columnHelper.accessor("alias", {
      header: "Alias",
      // Mismo criterio que el folio en el resto de las tablas: el
      // identificador principal abre el detalle, con la misma llamada que la
      // acción "Ver resumen" del menú.
      cell: (info) => (
        <button
          type="button"
          onClick={() => onViewSummary(info.row.original.id)}
          title="Ver resumen"
          className="font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer text-left"
        >
          {info.getValue() || "—"}
        </button>
      ),
    }),
    columnHelper.accessor("banco_nombre", {
      header: "Banco",
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
      header: () => <div className="text-right">Saldo actual</div>,
      cell: (info) => (
        // Importe en LA MONEDA DE LA CUENTA, vía `formatSaldo`. El saldo lo
        // mantiene el backend al aplicar pagos y cobros; aquí solo se muestra.
        <div className="text-right tabular-nums font-semibold text-slate-800 dark:text-white">
          {formatSaldo(info.getValue(), info.row.original.moneda_codigo)}
        </div>
      ),
    }),
    columnHelper.accessor("activo", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge
          status={info.getValue() ? "activo" : "inactivo"}
          config={ACTIVO_INACTIVO_CFG}
        />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => (
        <ActionsCell row={row} onEdit={onEdit} onViewSummary={onViewSummary} />
      ),
    }),
  ] as ColumnDef<CuentaBancaria>[];

  return columns;
};
