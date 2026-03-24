import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Color } from "../interfaces/color.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteColor } from "../hooks/useDeleteColor";

import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { useState } from "react";

const columnHelper = createColumnHelper<Color>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<Color>;
  onEdit: (color: Color) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteColor, isPending } = useDeleteColor();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [];
  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(row.original),
    });
  }
  if (canDelete) {
    menuItems.push({
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isPending,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
      {canDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Eliminar Color"
          description="¿Estás seguro de que deseas eliminar este color? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => {
            deleteColor(row.original.id);
            setIsDeleteOpen(false);
          }}
          confirmColor="red"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onEdit: (color: Color) => void,
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("codigo_hex", {
      header: "Código HEX",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-slate-200 dark:border-slate-600"
            style={{ backgroundColor: `#${info.getValue()}` }}
          />
          <span className="font-mono text-slate-600 dark:text-slate-300">
            #{info.getValue()}
          </span>
        </div>
      ),
    }),
  ] as ColumnDef<Color>[];

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-center">Acciones</div>,
        cell: ({ row }) => (
          <ActionsCell
            row={row}
            onEdit={onEdit}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<Color>
    );
  }

  return columns;
};
