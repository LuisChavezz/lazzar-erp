import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { Area } from "@/src/features/areas/interfaces/area.interface";
import { Position } from "../interfaces/position.interface";
import { useDeletePosition } from "../hooks/useDeletePosition";

const columnHelper = createColumnHelper<Position>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<Position>;
  onEdit: (position: Position) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deletePosition, isPending } = useDeletePosition();
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
          title="Eliminar Puesto"
          description="¿Estás seguro de que deseas eliminar este puesto? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => {
            deletePosition(row.original.id);
            setIsDeleteOpen(false);
          }}
          confirmColor="red"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onEdit: (position: Position) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  areas: Area[]
) => {
  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const areaNameById = new Map(areas.map((area) => [area.id, area.nombre]));

  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor(
      (row) => (row.area == null ? "—" : areaNameById.get(row.area) ?? String(row.area)),
      {
        id: "area",
        header: "Área",
        cell: (info) => (
          <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
        ),
      }
    ),
    columnHelper.accessor("salario_base", {
      header: "Salario Base",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {formatMoneyValueOrDash(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("activo", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge
          status={info.getValue() ? "activo" : "inactivo"}
          config={ACTIVO_INACTIVO_CFG}
        />
      ),
    }),
  ] as ColumnDef<Position>[];

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
      }) as ColumnDef<Position>
    );
  }

  return columns;
};
