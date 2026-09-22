import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Location } from "../interfaces/location.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteLocation } from "../hooks/useDeleteLocation";
import { capitalize } from "@/src/utils/capitalize";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { useState } from "react";

/**
 * Fila de la tabla: la ubicación tal como llega del backend más el nombre de
 * su almacén ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Si las ubicaciones llegaban antes que el catálogo de almacenes, el
 * accessor se congelaba con el ID crudo — en pantalla, en la búsqueda global y
 * en el orden. Al construir las filas en `LocationList` a partir de
 * ubicaciones + almacenes, la llegada del catálogo produce un `data` nuevo y
 * TanStack recalcula todo. Mismo arreglo que `ContractRow` y `CalendarRow`.
 *
 * `null` = el almacén no aparece en el catálogo (o todavía no llega).
 */
export type LocationRow = Location & { almacen_nombre: string | null };

const columnHelper = createColumnHelper<LocationRow>();

// Componente para renderizar las acciones de editar y eliminar una ubicación
const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<LocationRow>;
  onEdit: (location: Location) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  
  const { mutate: deleteLocation, isPending } = useDeleteLocation();
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
          title="Eliminar Ubicación"
          description="¿Estás seguro de que deseas eliminar esta ubicación? Esta acción no se puede deshacer."
          onConfirm={() => {
            deleteLocation(row.original.id_ubicacion);
            setIsDeleteOpen(false);
          }}
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          confirmColor="red"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onEdit: (location: Location) => void,
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
  const columns = [
    columnHelper.accessor("estatus", {
      header: "Estado",
      cell: (info) => {
        const status = info.getValue();
        const styles =
          status === "ACTIVO"
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
            : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
          >
            {capitalize(status)}
          </span>
        );
      },
    }),
    columnHelper.accessor("rack", {
      header: "Rack",
      cell: (info) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("pasillo", {
      header: "Pasillo",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    // Un solo valor alimenta la celda, la búsqueda global y el orden, así que
    // los tres ven el nombre resuelto. Siempre es string: el respaldo evita el
    // `null` que excluiría la columna de la búsqueda (ver DataTable).
    columnHelper.accessor(
      (row) => row.almacen_nombre ?? String(row.almacen),
      {
        id: "almacen",
        header: "Almacén",
        cell: (info) => (
          <span className="text-slate-500 dark:text-slate-400">
            {info.getValue()}
          </span>
        ),
      }
    ),
  ] as ColumnDef<LocationRow>[];

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <ActionsCell
            row={row}
            onEdit={onEdit}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<LocationRow>
    );
  }

  return columns;
};
