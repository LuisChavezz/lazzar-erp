import { ColumnDef, createColumnHelper, FilterFn, Row } from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import { EditIcon, BanIcon, CheckCircleIcon, ChevronRightIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG } from "@/src/components/StatusBadge";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { Banco } from "../interfaces/bank.interface";
import { useToggleBankActivo } from "../hooks/useToggleBankActivo";

const columnHelper = createColumnHelper<Banco>();

const ACTIVO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Activo", dotClassName: ACTIVO_INACTIVO_CFG.activo.dot },
  { value: "false", label: "Inactivo", dotClassName: ACTIVO_INACTIVO_CFG.inactivo.dot },
];

const activoFilterFn: FilterFn<Banco> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.activo) === filterValue;
};

const ActionsCell = ({
  row,
  onEdit,
  trigger,
}: {
  row: Row<Banco>;
  onEdit: (banco: Banco) => void;
  trigger: ReactNode;
}) => {
  const { mutate: toggleActivo, isPending } = useToggleBankActivo();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { activo } = row.original;
  // El destino del cambio: una fila activa se desactiva y viceversa.
  const nextActivo = !activo;

  // NO hay acción de eliminar: el DELETE del backend es un borrado FÍSICO, no
  // una baja lógica. `activo` es el único control de ciclo de vida.
  const menuItems: ActionMenuItem[] = [
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
        title={activo ? "Desactivar Banco" : "Activar Banco"}
        description={
          activo
            ? "¿Deseas desactivar este banco? Su información se conserva y seguirá visible en el listado con estatus Inactivo."
            : "¿Deseas activar este banco? Volverá a estar disponible para su uso."
        }
        confirmText={
          isPending
            ? activo
              ? "Desactivando..."
              : "Activando..."
            : activo
              ? "Desactivar"
              : "Activar"
        }
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

export const getColumns = (onEdit: (banco: Banco) => void) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Nombre</span>
          <ColumnHeaderFilter column={column} options={ACTIVO_FILTER_OPTIONS} label="estatus" />
        </div>
      ),
      filterFn: activoFilterFn,
      cell: (info) => {
        const banco = info.row.original;
        const statusCfg = banco.activo ? ACTIVO_INACTIVO_CFG.activo : ACTIVO_INACTIVO_CFG.inactivo;
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg.dot}`} title={statusCfg.label} aria-hidden="true" />
            <span className="sr-only">{statusCfg.label}</span>
            <ActionsCell
              row={info.row}
              onEdit={onEdit}
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
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("swift", {
      header: "SWIFT",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("observaciones", {
      header: "Observaciones",
      cell: (info) => {
        const value = info.getValue();
        return (
          // `observaciones` es un TextField sin tope de longitud: se recorta a
          // una línea para no descuadrar la fila y el texto completo queda en el
          // `title`.
          <span
            className="block max-w-xs truncate text-slate-500 dark:text-slate-400"
            title={value ?? undefined}
          >
            {value || "—"}
          </span>
        );
      },
    }),
  ] as ColumnDef<Banco>[];

  return columns;
};
