import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ProductType } from "../interfaces/product-type.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";

const columnHelper = createColumnHelper<ProductType>();

/**
 * Sin estado propio: la confirmación de baja y el diálogo de edición viven en
 * `ProductTypeList`, porque las celdas se desmontan al ordenar, paginar o
 * filtrar (y con ellas un diálogo abierto).
 */
const ActionsCell = ({
  row,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  row: Row<ProductType>;
  onEdit: (productType: ProductType) => void;
  onDelete: (productType: ProductType) => void;
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
  onEdit: (productType: ProductType) => void,
  onDelete: (productType: ProductType) => void,
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
  const columns = [
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200">
          {info.getValue().trim() || "—"}
        </span>
      ),
    }),
  ] as ColumnDef<ProductType>[];

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
      }) as ColumnDef<ProductType>
    );
  }

  return columns;
};
