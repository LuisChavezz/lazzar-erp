import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, BanIcon, CheckCircleIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { Banco } from "../interfaces/bank.interface";
import { useToggleBankActivo } from "../hooks/useToggleBankActivo";

const columnHelper = createColumnHelper<Banco>();

const ActionsCell = ({ row, onEdit }: { row: Row<Banco>; onEdit: (banco: Banco) => void }) => {
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
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
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
    </div>
  );
};

export const getColumns = (onEdit: (banco: Banco) => void) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {info.getValue() || "—"}
        </span>
      ),
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
      cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} />,
    }),
  ] as ColumnDef<Banco>[];

  return columns;
};
