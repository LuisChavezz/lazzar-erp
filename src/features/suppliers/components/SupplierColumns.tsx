import { useState } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { Supplier } from "../interfaces/supplier.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDeleteSupplier } from "../hooks/useDeleteSupplier";

const columnHelper = createColumnHelper<Supplier>();

// ─── Actions Cell ─────────────────────────────────────────────────────────────

const ActionsCell = ({
  supplier,
  onEdit,
  canEdit,
  canDelete,
}: {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteSupplier, isPending } = useDeleteSupplier();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [];

  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(supplier),
    });
  }

  if (canDelete) {
    menuItems.push({
      label: "Cancelar",
      icon: DeleteIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isPending,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
      {canDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Eliminar Proveedor"
          description={`¿Estás seguro de que deseas eliminar al proveedor "${supplier.nombre}"? Esta acción no se puede deshacer.`}
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          confirmColor="red"
          onConfirm={() => {
            deleteSupplier(supplier.id);
            setIsDeleteOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ─── Columnas de la tabla de proveedores ──────────────────────────────────────
// Código+Nombre y Correo+Teléfono se consolidan en una sola columna cada uno
// (Proveedor / Contacto) — mismo estándar visual que Órdenes de Compra/
// Pedidos/Recepciones: un campo compacto (el código, ya era un pill) junto al
// identificador primario, en vez de una columna aparte por cada dato
// secundario. No hay un campo categórico real (estatus, tipo…) en el listado
// para un filtro de encabezado tipo Excel, así que esta tabla no lleva uno —
// sería fabricar una dimensión que el dato no tiene.

export const getSupplierColumns = (
  onEdit: (supplier: Supplier) => void,
  permissions?: { canEdit: boolean; canDelete: boolean }
): ColumnDef<Supplier>[] => [
  columnHelper.accessor((row) => `${row.codigo} ${row.nombre}`.trim(), {
    id: "proveedor",
    header: "Proveedor",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 rounded shrink-0">
          {row.original.codigo}
        </span>
        <span
          className="font-medium text-slate-900 dark:text-white truncate"
          title={row.original.nombre}
        >
          {row.original.nombre}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("razon_social", {
    header: "Razón Social",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor("rfc", {
    header: "RFC",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
        {info.getValue() as string}
      </span>
    ),
  }),
  columnHelper.accessor((row) => `${row.email} ${row.telefono}`.trim(), {
    id: "contacto",
    header: "Contacto",
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
    cell: (info) => (
      <ActionsCell
        supplier={info.row.original}
        onEdit={onEdit}
        canEdit={permissions?.canEdit ?? false}
        canDelete={permissions?.canDelete ?? false}
      />
    ),
  }),
] as ColumnDef<Supplier>[];
