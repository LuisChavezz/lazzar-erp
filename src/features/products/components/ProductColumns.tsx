import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Product } from "../interfaces/product.interface";
import type { ProductCategory } from "../../product-categories/interfaces/product-category.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteProduct } from "../hooks/useDeleteProduct";
import { ActionMenu, ActionMenuItem } from "../../../components/ActionMenu";
import { textOrDash } from "../../../components/DetailDialogPrimitives";
import { useState } from "react";
import { getCategoriaLineaLabel } from "../../product-categories/constants/categoriaLinea";
import {
  CategoryHeaderFilter,
  CodProscaiHeaderFilter,
  LineaHeaderFilter,
  PriceRangeHeaderFilter,
} from "./CatalogHeaderFilters";

/**
 * Fila de la tabla: el producto tal como llega del backend más el nombre y la
 * línea de su categoría ya resueltos. Es un modelo de vista, no un tipo del
 * backend: `producto/` solo trae el id de la categoría.
 *
 * Desde EC-897 la búsqueda, el orden y los filtros los resuelve el servidor;
 * resolverlos en la fila (y no en la celda con un `Map`) hace que la llegada
 * tardía del catálogo de categorías produzca un `data` nuevo y la tabla se
 * vuelva a pintar con los nombres.
 *
 * `null` = la categoría no aparece en el catálogo (sin categoría, inactiva o
 * el catálogo todavía no llega). `categoria_linea` es la `linea` cruda (`""` =
 * sin línea, materia prima).
 */
export type ProductRow = Product & {
  categoria_nombre: string | null;
  categoria_linea: string | null;
};

/**
 * Filas de las listas de productos (`ProductList`, `ProductionProductsView`):
 * cada producto con el nombre y la línea de su categoría, resueltos con UNA
 * búsqueda en el catálogo ya cargado. `null` en ambos si la categoría no está
 * en el catálogo (sin categoría, inactiva o el catálogo aún no llega).
 */
export function buildProductRows(
  products: readonly Product[],
  categories: readonly Pick<ProductCategory, "id" | "nombre" | "linea">[],
): ProductRow[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  return products.map((product) => {
    const category = categoriesById.get(product.categoria_producto);
    return {
      ...product,
      categoria_nombre: category?.nombre ?? null,
      categoria_linea: category?.linea ?? null,
    };
  });
}

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

/**
 * Qué filtros de encabezado lleva la tabla. Cada vista conserva los que tenía
 * en modo cliente: Producción todos (`"all"`) y Configuración solo la línea
 * (`"linea"`). Sin filtros de Estado ni de Nombre: el listado ya es solo de
 * activos y la búsqueda (`q`) cubre el nombre (EC-897).
 */
export type ProductHeaderFilters = "all" | "linea";

/**
 * Columnas de las tablas de productos en MODO SERVIDOR (EC-897): cada columna
 * ordenable declara su campo de la lista blanca del backend (`serverSort`) y
 * cada filtro su clave (`serverFilter`), con opciones fijas o de un catálogo
 * (`CatalogHeaderFilters`), nunca de las filas.
 */
export const getColumns = (
  onEdit: (product: Product) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  headerFilters: ProductHeaderFilters = "linea",
) => {
  const allFilters = headerFilters === "all";
  const columns = [
    columnHelper.accessor((row) => (row.activo), {
      id: "activo",
      header: "Estado",
      size: 100,
      meta: { label: "Estado", serverSort: "activo" },
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
      meta: { label: "Nombre", serverSort: "nombre" },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    // Nullable: un producto que no pasó por el alta rápida puede no tener código.
    columnHelper.accessor((row) => row.codigo ?? "", {
      id: "codigo",
      header: "Código",
      meta: { label: "Código", serverSort: "codigo" },
      cell: ({ row }) => (
        <span className="text-slate-500 dark:text-slate-400">{textOrDash(row.original.codigo)}</span>
      ),
    }),
    columnHelper.accessor("cod_proscai", {
      header: allFilters
        ? ({ column }) => <CodProscaiHeaderFilter column={column} title="Cód. Proscai" />
        : "Cód. Proscai",
      meta: {
        label: "Cód. Proscai",
        serverSort: "cod_proscai",
        ...(allFilters ? { serverFilter: "con_cod_proscai" } : {}),
      },
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // La celda lee el nombre ya resuelto en la fila (ver `ProductRow`); sin
    // resolver (categoría inactiva o catálogo aún cargando), el id. El orden es
    // del servidor, por el nombre de la categoría.
    columnHelper.accessor((row) => row.categoria_nombre ?? "", {
      id: "categoria_producto",
      header: allFilters
        ? ({ column }) => <CategoryHeaderFilter column={column} title="Categoría" />
        : "Categoría",
      meta: {
        label: "Categoría",
        serverSort: "categoria_producto__nombre",
        ...(allFilters ? { serverFilter: "categoria_producto" } : {}),
      },
      cell: ({ row }) => (
        <span className="text-slate-500 dark:text-slate-400">
          {row.original.categoria_nombre ?? `#${row.original.categoria_producto}`}
        </span>
      ),
    }),
    // Ordena y filtra por la línea cruda de la categoría (`linea`, con
    // `SIN_LINEA` para vacía o sin categoría). Sin categoría resuelta no hay
    // línea que mostrar.
    columnHelper.accessor(
      (row) => (row.categoria_linea === null ? "" : getCategoriaLineaLabel(row.categoria_linea)),
      {
        id: "categoria_linea",
        header: ({ column }) => <LineaHeaderFilter column={column} title="Línea" />,
        meta: { label: "Línea", serverSort: "categoria_producto__linea", serverFilter: "linea" },
        cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400">
            {row.original.categoria_linea === null
              ? "—"
              : getCategoriaLineaLabel(row.original.categoria_linea)}
          </span>
        ),
      },
    ),
    columnHelper.accessor("precio_base", {
      header: allFilters
        ? ({ column }) => <PriceRangeHeaderFilter column={column} title="Precio" />
        : "Precio",
      meta: {
        align: "right",
        label: "Precio",
        serverSort: "precio_base",
        ...(allFilters ? { serverFilter: "rango_precio" } : {}),
      },
      // Sin símbolo: `precio_base` no declara moneda (EC-606).
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {formatMoneyValue(row.original.precio_base, null)}
        </span>
      ),
    }),
  ] as ColumnDef<ProductRow>[];

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
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<ProductRow>
    );
  }

  return columns;
};
