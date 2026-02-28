import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ProductType } from "../interfaces/product-type.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteProductType } from "../hooks/useDeleteProductType";

const columnHelper = createColumnHelper<ProductType>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<ProductType>;
  onEdit: (productType: ProductType) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteProductType, isPending } = useDeleteProductType();

  return (
    <div className="flex items-center justify-center gap-2">
      {canEdit ? (
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
          title="Editar"
          onClick={() => onEdit(row.original)}
        >
          <EditIcon className="w-5 h-5" />
        </button>
      ) : null}
      {canDelete ? (
        <ConfirmDialog
          title="Eliminar Tipo de Producto"
          description="¿Estás seguro de que deseas eliminar este tipo de producto? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => deleteProductType(row.original.id)}
          confirmColor="red"
          trigger={
            <button
              className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
              title="Eliminar"
              disabled={isPending}
            >
              <DeleteIcon className="w-5 h-5" />
            </button>
          }
        />
      ) : null}
    </div>
  );
};

export const getColumns = (
  onEdit: (productType: ProductType) => void,
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
  ] as ColumnDef<ProductType>[];

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
      }) as ColumnDef<ProductType>
    );
  }

  return columns;
};
