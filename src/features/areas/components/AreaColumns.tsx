import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { Department } from "@/src/features/departments/interfaces/department.interface";
import { Area } from "../interfaces/area.interface";
import { useDeleteArea } from "../hooks/useDeleteArea";

const columnHelper = createColumnHelper<Area>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<Area>;
  onEdit: (area: Area) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteArea, isPending } = useDeleteArea();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
          title="Eliminar Área"
          description="¿Estás seguro de que deseas eliminar esta área? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => {
            deleteArea(row.original.id);
            setIsDeleteOpen(false);
          }}
          confirmColor="red"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onEdit: (area: Area) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  departments: Department[]
) => {
  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const departmentNameById = new Map(
    departments.map((department) => [department.id_departamento, department.nombre])
  );

  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor(
      (row) => departmentNameById.get(row.departamento) ?? String(row.departamento),
      {
        id: "departamento",
        header: "Departamento",
        cell: (info) => (
          <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
        ),
      }
    ),
    columnHelper.accessor("activo", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge
          status={info.getValue() ? "activo" : "inactivo"}
          config={ACTIVO_INACTIVO_CFG}
        />
      ),
    }),
  ] as ColumnDef<Area>[];

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
      }) as ColumnDef<Area>
    );
  }

  return columns;
};
