import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { formatLocalDate } from "@/src/utils/formatDate";
import { Shift } from "@/src/features/shifts/interfaces/shift.interface";
import { Calendar } from "../interfaces/calendar.interface";
import { getTipoLabel } from "../constants/tipoCalendario";
import { useDeleteCalendar } from "../hooks/useDeleteCalendar";

const columnHelper = createColumnHelper<Calendar>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<Calendar>;
  onEdit: (calendar: Calendar) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteCalendar, isPending } = useDeleteCalendar();
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
    // "Eliminar", no "Desactivar": aquí el DELETE borra la fila de verdad,
    // porque `Calendario` no tiene `activo`.
    menuItems.push({
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isPending,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de día de calendario" />
      {canDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Eliminar Día de Calendario"
          description="¿Estás seguro de que deseas eliminar este día? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => {
            deleteCalendar(row.original.id);
            setIsDeleteOpen(false);
          }}
          confirmColor="red"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onEdit: (calendar: Calendar) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  shifts: Shift[]
) => {
  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const shiftNameById = new Map(shifts.map((shift) => [shift.id, shift.nombre]));

  const columns = [
    // El accessor devuelve la fecha YA formateada, no el ISO crudo: la búsqueda
    // global de DataTable lee el valor del accessor, así que teclear la fecha
    // tal como se ve en pantalla ("15/01/2026") tiene que encontrarla.
    columnHelper.accessor((row) => formatLocalDate(row.fecha), {
      id: "fecha",
      header: "Fecha",
      // El orden va sobre el ISO crudo: ordenar "15/01/2026" como texto pondría
      // los días antes que los meses.
      sortingFn: (rowA, rowB) => rowA.original.fecha.localeCompare(rowB.original.fecha),
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => getTipoLabel(row.tipo) ?? "—", {
      id: "tipo",
      header: "Tipo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => shiftNameById.get(row.turno) ?? String(row.turno), {
      id: "turno",
      header: "Turno",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // Sin columna "Estatus": `Calendario` no tiene `activo`.
  ] as ColumnDef<Calendar>[];

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
      }) as ColumnDef<Calendar>
    );
  }

  return columns;
};
