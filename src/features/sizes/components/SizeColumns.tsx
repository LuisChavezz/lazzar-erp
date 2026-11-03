import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Size } from "../interfaces/size.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";

const columnHelper = createColumnHelper<Size>();

/**
 * Sin estado propio: la confirmación de baja y el diálogo de edición viven en
 * `SizeList`, porque las celdas se desmontan al ordenar, paginar o filtrar (y
 * con ellas un diálogo abierto).
 */
const ActionsCell = ({
  row,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  row: Row<Size>;
  onEdit: (size: Size) => void;
  onDelete: (size: Size) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
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
      label: "Dar de baja",
      icon: DeleteIcon,
      onSelect: () => onDelete(row.original),
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

export const getColumns = (
  onEdit: (size: Size) => void,
  onDelete: (size: Size) => void,
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
  ] as ColumnDef<Size>[];

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        meta: { align: "center" },
        cell: ({ row }) => (
          <ActionsCell
            row={row}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<Size>
    );
  }

  return columns;
};
