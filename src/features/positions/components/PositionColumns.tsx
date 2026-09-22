import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { EditIcon, BanIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { Position } from "../interfaces/position.interface";
import { useDeletePosition } from "../hooks/useDeletePosition";

/**
 * Fila de la tabla: el puesto tal como llega del backend más el nombre de su
 * área ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Si los puestos llegaban antes que el catálogo de áreas, el accessor
 * se congelaba con el ID crudo — en pantalla, en la búsqueda global y en el
 * orden. Al construir las filas en `PositionList` a partir de puestos + áreas,
 * la llegada del catálogo produce un `data` nuevo y TanStack recalcula todo.
 * Mismo arreglo que `ContractRow` y `CalendarRow`.
 *
 * `null` = sin área asignada, o el área no aparece en el catálogo (o todavía
 * no llega).
 */
export type PositionRow = Position & { area_nombre: string | null };

const columnHelper = createColumnHelper<PositionRow>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<PositionRow>;
  onEdit: (position: Position) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deletePosition, isPending } = useDeletePosition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // El DELETE del backend es una baja lógica: pone `activo` en false, no borra
  // el registro. Por eso la acción se ofrece solo sobre puestos activos — sobre
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
      <ActionMenu items={menuItems} />
      {canDeactivate && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Desactivar Puesto"
          description="¿Deseas desactivar este puesto? Su información se conserva y seguirá visible en el listado con estatus Inactivo."
          confirmText={isPending ? "Desactivando..." : "Desactivar"}
          onConfirm={() => {
            deletePosition(row.original.id);
            setIsDeleteOpen(false);
          }}
          confirmColor="amber"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onEdit: (position: Position) => void,
  permissions: { canEdit: boolean; canDelete: boolean }
) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
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
      (row) => (row.area == null ? "—" : row.area_nombre ?? String(row.area)),
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
  ] as ColumnDef<PositionRow>[];

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
      }) as ColumnDef<PositionRow>
    );
  }

  return columns;
};
