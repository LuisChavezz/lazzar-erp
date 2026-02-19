import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ProductType } from "../interfaces/product-type.interface";
import { useProductTypeStore } from "../stores/product-type.store";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<ProductType>();

const ActionsCell = ({
  row,
  onEdit,
}: {
  row: Row<ProductType>;
  onEdit: (productType: ProductType) => void;
}) => {
  const deleteProductType = useProductTypeStore((state) => state.deleteProductType);

  const handleDelete = () => {
    deleteProductType(row.original);
    toast.success("Tipo de producto eliminado correctamente");
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
        title="Editar"
        onClick={() => onEdit(row.original)}
      >
        <EditIcon className="w-5 h-5" />
      </button>
      <ConfirmDialog
        title="Eliminar Tipo de Producto"
        description="¿Estás seguro de que deseas eliminar este tipo de producto? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        confirmColor="red"
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <DeleteIcon className="w-5 h-5" />
          </button>
        }
      />
    </div>
  );
};

export const getColumns = (
  onEdit: (productType: ProductType) => void,
  isAdmin: boolean
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
    columnHelper.accessor("descripcion", {
      header: "Descripción",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue() || "Sin descripción"}
        </span>
      ),
    }),
  ] as ColumnDef<ProductType>[];

  if (isAdmin) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-center">Acciones</div>,
        cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} />,
      }) as ColumnDef<ProductType>
    );
  }

  return columns;
};
