import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { formatLocalDate } from "@/src/utils/formatDate";
import { Calendar } from "../interfaces/calendar.interface";
import { getTipoLabel } from "../constants/tipoCalendario";
import { useDeleteCalendar } from "../hooks/useDeleteCalendar";

/**
 * Fila de la tabla: el día tal como llega del backend más el nombre del turno
 * ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Si los días llegaban antes que el catálogo de turnos, el accessor
 * se congelaba con el ID crudo — en pantalla, en la búsqueda global y en el
 * orden, que leen ese mismo valor. Al construir las filas en `CalendarList` a
 * partir de días + turnos, la llegada del catálogo produce un `data` nuevo y
 * TanStack recalcula todo. Mismo arreglo que `ContractRow`.
 *
 * `null` = el turno no aparece en el catálogo (o todavía no llega).
 */
export type CalendarRow = Calendar & { turno_nombre: string | null };

const columnHelper = createColumnHelper<CalendarRow>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<CalendarRow>;
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
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
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
    // Un solo valor alimenta la celda, la búsqueda global y el orden, así que
    // los tres ven el nombre resuelto. Siempre es string: el respaldo evita el
    // `null` que excluiría la columna de la búsqueda (ver DataTable).
    columnHelper.accessor((row) => row.turno_nombre ?? String(row.turno), {
      id: "turno",
      header: "Turno",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // Sin columna "Estatus": `Calendario` no tiene `activo`.
  ] as ColumnDef<CalendarRow>[];

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
      }) as ColumnDef<CalendarRow>
    );
  }

  return columns;
};
