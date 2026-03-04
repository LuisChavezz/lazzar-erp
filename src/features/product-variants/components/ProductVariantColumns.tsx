"use client";

import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ProductVariant } from "../interfaces/product-variant.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteProductVariant } from "../hooks/useDeleteProductVariant";

const columnHelper = createColumnHelper<ProductVariant>();

interface ProductVariantLookups {
  products: Map<number, string>;
  colors: Map<number, string>;
  sizes: Map<number, string>;
}

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<ProductVariant>;
  onEdit: (variant: ProductVariant) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteProductVariant } = useDeleteProductVariant();
  const handleDelete = () => deleteProductVariant(row.original.id);

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
          title="Eliminar Variante"
          description="¿Estás seguro de que deseas eliminar esta variante? Esta acción no se puede deshacer."
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
  onEdit: (variant: ProductVariant) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  lookups: ProductVariantLookups
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
            {isActive ? "Activo" : "Inactivo"}
          </span>
        );
      },
    }),
    columnHelper.accessor("sku", {
      header: "SKU",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor(
      (row) => lookups.products.get(row.producto) ?? "",
      {
        id: "producto",
        header: "Producto",
        cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400">
            {lookups.products.get(row.original.producto) ?? `#${row.original.producto}`}
          </span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => lookups.colors.get(row.color) ?? "",
      {
        id: "color",
        header: "Color",
        cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400">
            {lookups.colors.get(row.original.color) ?? `#${row.original.color}`}
          </span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => lookups.sizes.get(row.talla) ?? "",
      {
        id: "talla",
        header: "Talla",
        cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400">
            {lookups.sizes.get(row.original.talla) ?? `#${row.original.talla}`}
          </span>
        ),
      }
    ),
    columnHelper.accessor("precio_base", {
      header: "Precio Base",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
  ] as ColumnDef<ProductVariant>[];

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
      }) as ColumnDef<ProductVariant>
    );
  }

  return columns;
};
