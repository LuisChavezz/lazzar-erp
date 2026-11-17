import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Product } from "../interfaces/product.interface";
import { ActionMenu, ActionMenuItem } from "../../../components/ActionMenu";
import { textOrDash } from "../../../components/DetailDialogPrimitives";
import { getCategoriaLineaLabel } from "../../product-categories/constants/categoriaLinea";
import {
  CategoryHeaderFilter,
  CodProscaiHeaderFilter,
  LineaHeaderFilter,
  PriceRangeHeaderFilter,
} from "./CatalogHeaderFilters";

/**
 * Categoría de un producto como la pinta la tabla: el nombre que trae la fila
 * (`categoria_producto_nombre`, EC-905), también si la categoría está
 * inactiva; "—" sin categoría.
 */
export const productCategoryLabel = (
  product: Pick<Product, "categoria_producto_nombre">,
): string => textOrDash(product.categoria_producto_nombre);

/**
 * Línea de un producto como la pinta la tabla, de la línea que trae la fila
 * (`categoria_producto_linea`, EC-905, también con la categoría inactiva).
 * Vacía (`""`) o sin categoría (`null`) es "Sin línea (materia prima)": las
 * dos son la opción `SIN_LINEA` del filtro, así que celda y filtro coinciden.
 */
export const productLineaLabel = (product: Pick<Product, "categoria_producto_linea">): string =>
  getCategoriaLineaLabel(product.categoria_producto_linea);

const columnHelper = createColumnHelper<Product>();

/**
 * Acciones de una fila. El diálogo de baja vive en la LISTA (`ProductList`), no
 * en la celda: en modo servidor un cambio de página o un refetch desmontan las
 * celdas, y un diálogo dentro se cerraría con ellas. La celda solo avisa qué
 * producto y qué acción.
 */
export interface ProductRowActions {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const ActionsCell = ({
  product,
  actions,
  canEdit,
  canDelete,
}: {
  product: Product;
  actions: ProductRowActions;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const menuItems: ActionMenuItem[] = [];
  if (canEdit) {
    menuItems.push({ label: "Editar", icon: EditIcon, onSelect: () => actions.onEdit(product) });
  }
  if (canDelete) {
    menuItems.push({ label: "Cancelar", icon: DeleteIcon, onSelect: () => actions.onDelete(product) });
  }
  if (menuItems.length === 0) return null;
  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

/** Sin acciones: la vista de Producción solo lista. */
const NO_ROW_ACTIONS: ProductRowActions = { onEdit: () => {}, onDelete: () => {} };

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
  actions: ProductRowActions | null,
  permissions: { canEdit: boolean; canDelete: boolean },
  headerFilters: ProductHeaderFilters = "linea",
) => {
  const allFilters = headerFilters === "all";
  const columns = [
    columnHelper.accessor((row) => (row.activo), {
      id: "activo",
      header: "Estado",
      size: 100,
      // Sin orden: `producto/` solo lista activos, así que ordenar por Estado no
      // cambiaría nada.
      meta: { label: "Estado" },
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
    // Nombre y línea llegan en la fila (EC-905), también de una categoría
    // inactiva; el orden es del servidor.
    columnHelper.accessor((row) => row.categoria_producto_nombre ?? "", {
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
          {productCategoryLabel(row.original)}
        </span>
      ),
    }),
    // Ordena y filtra por la línea cruda de la categoría (`linea`, con
    // `SIN_LINEA` para vacía o sin categoría).
    columnHelper.accessor(
      (row) => productLineaLabel(row),
      {
        id: "categoria_linea",
        header: ({ column }) => <LineaHeaderFilter column={column} title="Línea" />,
        meta: { label: "Línea", serverSort: "categoria_producto__linea", serverFilter: "linea" },
        cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400">
            {productLineaLabel(row.original)}
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
      // Sin símbolo: `precio_base` no declara moneda (EC-606). Sin precio, "—".
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {formatMoneyValueOrDash(row.original.precio_base, null)}
        </span>
      ),
    }),
  ] as ColumnDef<Product>[];

  if (permissions.canEdit || permissions.canDelete) {
    const rowActions = actions ?? NO_ROW_ACTIONS;
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        meta: { align: "center" },
        cell: ({ row }) => (
          <ActionsCell
            product={row.original}
            actions={rowActions}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<Product>
    );
  }

  return columns;
};
