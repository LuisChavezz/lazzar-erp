import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Product } from "../interfaces/product.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteProduct } from "../hooks/useDeleteProduct";
import { ActionMenu, ActionMenuItem } from "../../../components/ActionMenu";
import { useState } from "react";

/**
 * Fila de la tabla: el producto tal como llega del backend más el nombre de su
 * categoría ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. La celda leía el catálogo en vivo y se veía bien, pero si el
 * usuario buscaba u ordenaba mientras el catálogo de categorías aún cargaba,
 * el accessor se congelaba en `""`: después ni la búsqueda encontraba el
 * producto por su categoría ni el orden por Categoría ordenaba. Al construir
 * las filas en `ProductList` a partir de productos + categorías, la llegada
 * del catálogo produce un `data` nuevo y TanStack recalcula todo. Mismo
 * arreglo que `ContractRow` y `CalendarRow`.
 *
 * `null` = la categoría no aparece en el catálogo (o todavía no llega).
 */
export type ProductRow = Product & { categoria_nombre: string | null };

const columnHelper = createColumnHelper<ProductRow>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<ProductRow>;
  onEdit: (product: Product) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteProduct, isPending } = useDeleteProduct();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      label: "Cancelar",
      icon: DeleteIcon,
      onSelect: () => setShowDeleteConfirm(true),
      disabled: isPending,
    });
  }

  if (menuItems.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-center">
        <ActionMenu items={menuItems} />
      </div>
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Eliminar Producto"
          description="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => {
            deleteProduct(row.original.id);
            setShowDeleteConfirm(false);
          }}
          confirmColor="red"
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          trigger={null}
        />
      )}
    </>
  );
};

export const getColumns = (
  onEdit: (product: Product) => void,
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
  const columns = [
    columnHelper.accessor((row) => (row.activo), {
      id: "activo",
      header: "Estado",
      size: 100,
      cell: ({ row }) => {
        const isActive = row.original.activo;
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
    columnHelper.accessor("nombre", {
      header: "Nombre",
      size: 200,
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("cod_proscai", {
      header: "Cód. Proscai",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // El accessor (búsqueda y orden) y la celda leen el mismo nombre ya
    // resuelto en la fila (ver `ProductRow`). Sin resolver, el accessor da `""`
    // —string, así la columna sigue en la búsqueda global— y la celda el ID.
    columnHelper.accessor((row) => row.categoria_nombre ?? "", {
      id: "categoria_producto",
      header: "Categoría",
      cell: ({ row }) => (
        <span className="text-slate-500 dark:text-slate-400">
          {row.original.categoria_nombre ?? `#${row.original.categoria_producto}`}
        </span>
      ),
    }),
    columnHelper.accessor("precio_base", {
      header: "Precio",
      cell: ({ row }) => {
        const value = row.original.precio_base;
        const formatted = new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(parseFloat(value));
        return <span className="text-slate-600 dark:text-slate-300 font-medium">{formatted}</span>;
      },
    }),
  ] as ColumnDef<ProductRow>[];

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
      }) as ColumnDef<ProductRow>
    );
  }

  return columns;
};
