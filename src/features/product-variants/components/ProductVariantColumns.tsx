"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import {
  EditIcon,
  DeleteIcon,
  ClipboardListIcon,
  PencilSquareIcon,
} from "../../../components/Icons";
import { ProductVariant } from "../interfaces/product-variant.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import {
  ActivoHeaderFilter,
  ColorHeaderFilter,
  PriceRangeHeaderFilter,
  ProductServerSearchHeaderFilter,
  SizeHeaderFilter,
} from "@/src/features/products/components/CatalogHeaderFilters";

const columnHelper = createColumnHelper<ProductVariant>();

/**
 * Acciones de una fila. Los diálogos (lista de materiales, su edición, el
 * asistente para agregar materiales y la baja) viven en la LISTA, no en la
 * celda: en modo servidor un cambio de página, un refetch o una baja
 * desmontan las celdas, y un diálogo dentro se cerraría con ellas. La celda
 * solo avisa qué variante y qué acción.
 */
export interface ProductVariantRowActions {
  onEdit: (variant: ProductVariant) => void;
  onOpenBom: (variant: ProductVariant) => void;
  onEditBom: (variant: ProductVariant) => void;
  onDelete: (variant: ProductVariant) => void;
}

const ActionsCell = ({
  variant,
  actions,
  canEdit,
  canDelete,
}: {
  variant: ProductVariant;
  actions: ProductVariantRowActions;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const menuItems: ActionMenuItem[] = [
    {
      label: "Lista de Materiales",
      icon: ClipboardListIcon,
      onSelect: () => actions.onOpenBom(variant),
    },
    {
      label: "Editar Lista de Materiales",
      icon: PencilSquareIcon,
      onSelect: () => actions.onEditBom(variant),
    },
  ];
  if (canEdit) {
    menuItems.push({ label: "Editar", icon: EditIcon, onSelect: () => actions.onEdit(variant) });
  }
  if (canDelete) {
    menuItems.push({ label: "Cancelar", icon: DeleteIcon, onSelect: () => actions.onDelete(variant) });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

/** Sin acciones: la vista de Producción solo lista. */
const NO_ROW_ACTIONS: ProductVariantRowActions = {
  onEdit: () => {},
  onOpenBom: () => {},
  onEditBom: () => {},
  onDelete: () => {},
};

/**
 * Columnas de las tablas de variantes en MODO SERVIDOR (EC-897): cada columna
 * ordena por su campo de la lista blanca del backend (`serverSort`; producto,
 * color y talla por su nombre, la talla en su orden canónico). Con
 * `withHeaderFilters` (Producción) llevan además su filtro de encabezado
 * (`serverFilter`), con opciones de un catálogo o fijas, nunca de las filas;
 * Configuración no los tenía y sigue sin ellos.
 */
export const getColumns = (
  actions: ProductVariantRowActions | null,
  permissions: { canEdit: boolean; canDelete: boolean },
  { withHeaderFilters = false }: { withHeaderFilters?: boolean } = {},
) => {
  const columns = [
    columnHelper.accessor("activo", {
      header: withHeaderFilters
        ? ({ column }) => <ActivoHeaderFilter column={column} title="Estado" />
        : "Estado",
      meta: {
        label: "Estado",
        serverSort: "activo",
        ...(withHeaderFilters ? { serverFilter: "activo" } : {}),
      },
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
      meta: { label: "SKU", serverSort: "sku" },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    // Los nombres llegan resueltos en la fila (`producto_nombre`, `color_nombre`,
    // `talla_nombre`); `#id` queda solo como respaldo.
    columnHelper.accessor((row) => row.producto_nombre ?? "", {
      id: "producto",
      header: withHeaderFilters
        ? ({ column }) => <ProductServerSearchHeaderFilter column={column} title="Producto" />
        : "Producto",
      meta: {
        label: "Producto",
        serverSort: "producto__nombre",
        ...(withHeaderFilters ? { serverFilter: "producto" } : {}),
      },
      cell: ({ row }) => (
        <span className="text-slate-500 dark:text-slate-400">
          {row.original.producto_nombre || `#${row.original.producto}`}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.color_nombre ?? "", {
      id: "color",
      header: withHeaderFilters
        ? ({ column }) => <ColorHeaderFilter column={column} title="Color" />
        : "Color",
      meta: {
        label: "Color",
        serverSort: "color__nombre",
        ...(withHeaderFilters ? { serverFilter: "color" } : {}),
      },
      cell: ({ row }) => (
        <span className="text-slate-500 dark:text-slate-400">
          {row.original.color_nombre || `#${row.original.color}`}
        </span>
      ),
    }),
    // `talla` es null en variantes de productos que no son PT (EC-252); en ese
    // caso `talla_nombre` llega null u omitido. Al ordenar van al final.
    columnHelper.accessor((row) => row.talla_nombre ?? "", {
      id: "talla",
      header: withHeaderFilters
        ? ({ column }) => <SizeHeaderFilter column={column} title="Talla" />
        : "Talla",
      meta: {
        label: "Talla",
        serverSort: "talla__nombre",
        ...(withHeaderFilters ? { serverFilter: "talla" } : {}),
      },
      cell: ({ row }) => {
        const { talla, talla_nombre } = row.original;
        return (
          <span className="text-slate-500 dark:text-slate-400">
            {talla === null ? "—" : talla_nombre || `#${talla}`}
          </span>
        );
      },
    }),
    columnHelper.accessor("precio_base", {
      header: withHeaderFilters
        ? ({ column }) => <PriceRangeHeaderFilter column={column} title="Precio Base" />
        : "Precio Base",
      meta: {
        align: "right",
        label: "Precio Base",
        serverSort: "precio_base",
        ...(withHeaderFilters ? { serverFilter: "rango_precio" } : {}),
      },
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
  ] as ColumnDef<ProductVariant>[];

  if (permissions.canEdit || permissions.canDelete) {
    const rowActions = actions ?? NO_ROW_ACTIONS;
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        meta: { align: "center" },
        cell: ({ row }) => (
          <ActionsCell
            variant={row.original}
            actions={rowActions}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<ProductVariant>
    );
  }

  return columns;
};
