import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ProductCategory } from "../interfaces/product-category.interface";
import { useProductCategoryStore } from "../stores/product-category.store";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<ProductCategory>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<ProductCategory>;
  onEdit: (category: ProductCategory) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const deleteCategory = useProductCategoryStore((state) => state.deleteCategory);

  const handleDelete = () => {
    deleteCategory(row.original.id);
    toast.success("Categoría eliminada correctamente");
  };

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
          title="Eliminar Categoría"
          description="¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer."
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
      ) : null}
    </div>
  );
};

export const getColumns = (
  onEdit: (category: ProductCategory) => void,
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
  const columns = [
    columnHelper.accessor("activo", {
      header: "Estado",
      cell: (info) => {
        const isActive = info.getValue();
        const styles = isActive
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            {isActive ? "Activa" : "Inactiva"}
          </span>
        );
      },
    }),
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
        <span className="text-slate-600 dark:text-slate-300 font-medium">
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
  ] as ColumnDef<ProductCategory>[];

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
      }) as ColumnDef<ProductCategory>
    );
  }

  return columns;
};
