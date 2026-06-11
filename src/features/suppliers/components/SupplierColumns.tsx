import { useState } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { Supplier } from "../interfaces/supplier.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDeleteSupplier } from "../hooks/useDeleteSupplier";

const columnHelper = createColumnHelper<Supplier>();

// ─── Actions Cell ─────────────────────────────────────────────────────────────

const ActionsCell = ({
  supplier,
  onEdit,
}: {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
}) => {
  const { mutate: deleteSupplier, isPending } = useDeleteSupplier();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(supplier),
    },
    {
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isPending,
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Eliminar Proveedor"
        description={`¿Estás seguro de que deseas eliminar al proveedor "${supplier.nombre}"? Esta acción no se puede deshacer.`}
        confirmText={isPending ? "Eliminando..." : "Eliminar"}
        confirmColor="red"
        onConfirm={() => {
          deleteSupplier(supplier.id);
          setIsDeleteOpen(false);
        }}
      />
    </div>
  );
};

// ─── Columnas de la tabla de proveedores ──────────────────────────────────────

export const getSupplierColumns = (
  onEdit: (supplier: Supplier) => void
): ColumnDef<Supplier>[] => [
  columnHelper.accessor("codigo", {
    header: "Código",
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-1 rounded-lg">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor("nombre", {
    header: "Nombre",
    cell: (info) => (
      <span className="font-medium text-slate-900 dark:text-white">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor("razon_social", {
    header: "Razón Social",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor("rfc", {
    header: "RFC",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor("email", {
    header: "Correo",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor("telefono", {
    header: "Teléfono",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: (info) => <ActionsCell supplier={info.row.original} onEdit={onEdit} />,
  }),
] as ColumnDef<Supplier>[];
