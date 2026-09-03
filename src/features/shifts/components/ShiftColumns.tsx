import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, BanIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { Shift } from "../interfaces/shift.interface";
import { trimTimeToHHMM } from "../utils/shiftTime";
import { useDeleteShift } from "../hooks/useDeleteShift";

const columnHelper = createColumnHelper<Shift>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<Shift>;
  onEdit: (shift: Shift) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteShift, isPending } = useDeleteShift();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // El DELETE del backend es una baja lógica: pone `activo` en false, no borra
  // el registro. Por eso la acción se ofrece solo sobre turnos activos — sobre
  // uno inactivo sería un no-op.
  const canDeactivate = canDelete && row.original.activo;

  const menuItems: ActionMenuItem[] = [];
  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(row.original),
    });
  }
  if (canDeactivate) {
    menuItems.push({
      label: "Desactivar",
      icon: BanIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isPending,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de turno" />
      {canDeactivate && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Desactivar Turno"
          description="¿Deseas desactivar este turno? Su información se conserva y seguirá visible en el listado con estatus Inactivo."
          confirmText={isPending ? "Desactivando..." : "Desactivar"}
          onConfirm={() => {
            deleteShift(row.original.id);
            setIsDeleteOpen(false);
          }}
          confirmColor="amber"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onEdit: (shift: Shift) => void,
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    // Las horas llegan como "HH:MM:SS"; en la tabla sobran los segundos.
    columnHelper.accessor((row) => trimTimeToHHMM(row.hora_entrada), {
      id: "hora_entrada",
      header: "Entrada",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => trimTimeToHHMM(row.hora_salida), {
      id: "hora_salida",
      header: "Salida",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("dias_laborales", {
      header: "Días",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
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
  ] as ColumnDef<Shift>[];

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
      }) as ColumnDef<Shift>
    );
  }

  return columns;
};
