import Link from "next/link";
import { useIsMutating } from "@tanstack/react-query";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, DeleteIcon, ViewIcon } from "@/src/components/Icons";
import { Supplier } from "../interfaces/supplier.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { supplierDetailHref } from "../utils/supplierPurchaseOrderHistoryFilters";
import { DELETE_SUPPLIER_MUTATION_KEY } from "../hooks/useDeleteSupplier";

const columnHelper = createColumnHelper<Supplier>();

/**
 * Qué puede hacer el usuario en ESTE punto de montaje. Lo decide `SupplierList`
 * según su `permissionContext`: `canViewDetail` solo es `true` en Compras
 * (Configuración es solo de edición y no lleva entradas al detalle).
 */
export interface SupplierColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canViewDetail: boolean;
}

// ─── Actions Cell ─────────────────────────────────────────────────────────────

const ActionsCell = ({
  supplier,
  onEdit,
  onDeactivate,
  canEdit,
  canDelete,
  canViewDetail,
}: {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
  onDeactivate: (supplier: Supplier) => void;
} & SupplierColumnPermissions) => {
  // Global, no por fila: mientras CUALQUIER baja esté en vuelo no se permite
  // otra (ver `DELETE_SUPPLIER_MUTATION_KEY`). Se lee aquí y no se pasa por la
  // factoría de columnas, que remontaría todas las celdas al cambiar.
  const isDeactivating = useIsMutating({ mutationKey: DELETE_SUPPLIER_MUTATION_KEY }) > 0;
  const menuItems: ActionMenuItem[] = [];

  if (canViewDetail) {
    menuItems.push({
      label: "Ver detalle",
      icon: ViewIcon,
      // Enlace real (`href`), mismo destino que el nombre del proveedor: Next
      // lo prefetchea y clic medio/Ctrl+clic abren otra pestaña.
      href: supplierDetailHref(supplier.id),
    });
  }

  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(supplier),
    });
  }

  // Baja LÓGICA: el texto habla de "desactivar" y no de "eliminar". El diálogo
  // de confirmación vive en `SupplierList`, no en la celda (ver allí).
  if (canDelete) {
    menuItems.push({
      label: "Desactivar",
      icon: DeleteIcon,
      onSelect: () => onDeactivate(supplier),
      disabled: isDeactivating,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

// ─── Columnas de la tabla de proveedores ──────────────────────────────────────
// Código+Nombre y Correo+Teléfono se consolidan en una sola columna cada uno
// (Proveedor / Contacto) — mismo estándar visual que Órdenes de Compra/
// Pedidos/Recepciones: un campo compacto (el código, ya era un pill) junto al
// identificador primario, en vez de una columna aparte por cada dato
// secundario.
//
// Tabla en MODO SERVIDOR (`useSuppliersTable`): el backend busca, ordena y
// pagina. `meta.serverSort` es el campo de `ordering` de cada columna (lista
// blanca en `suppliersTable`). No hay filtros de encabezado: el endpoint no
// acepta filtros por proveedor, razón social, tipo de persona ni contacto.

export const getSupplierColumns = (
  onEdit: (supplier: Supplier) => void,
  onDeactivate: (supplier: Supplier) => void,
  permissions?: SupplierColumnPermissions,
): ColumnDef<Supplier>[] => [
  columnHelper.accessor((row) => `${row.codigo} ${row.nombre}`.trim(), {
    id: "proveedor",
    header: "Proveedor",
    // Ordena por el nombre, lo que se lee primero tras el código.
    meta: { label: "Proveedor", serverSort: "nombre" },
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 rounded shrink-0">
          {row.original.codigo}
        </span>
        {/* Con acceso al detalle, el nombre es un enlace REAL (clic medio abre
            pestaña nueva) a la misma página que "Ver detalle". */}
        {permissions?.canViewDetail ? (
          <Link
            href={supplierDetailHref(row.original.id)}
            className="font-medium text-slate-900 dark:text-white truncate hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
            title="Ver detalle"
          >
            {row.original.nombre}
          </Link>
        ) : (
          <span
            className="font-medium text-slate-900 dark:text-white truncate"
            title={row.original.nombre}
          >
            {row.original.nombre}
          </span>
        )}
      </div>
    ),
  }),
  columnHelper.accessor("razon_social", {
    header: "Razón Social",
    meta: { label: "Razón Social", serverSort: "razon_social" },
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor("rfc", {
    header: "RFC",
    meta: { label: "RFC", serverSort: "rfc" },
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor((row) => `${row.email} ${row.telefono}`.trim(), {
    id: "contacto",
    header: "Contacto",
    // Ordena por el correo, la primera línea de la celda.
    meta: { label: "Contacto", serverSort: "email" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p
          className="text-slate-700 dark:text-slate-200 truncate max-w-50"
          title={row.original.email}
        >
          {row.original.email || "—"}
        </p>
        <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {row.original.telefono || "—"}
        </p>
      </div>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Acciones",
    meta: { align: "center" },
    cell: (info) => (
      <ActionsCell
        supplier={info.row.original}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        canEdit={permissions?.canEdit ?? false}
        canDelete={permissions?.canDelete ?? false}
        canViewDetail={permissions?.canViewDetail ?? false}
      />
    ),
  }),
] as ColumnDef<Supplier>[];
