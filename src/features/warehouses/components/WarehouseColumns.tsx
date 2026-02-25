import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Warehouse } from "../interfaces/warehouse.interface";
import { Branch } from "../../branches/interfaces/branch.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteWarehouse } from "../hooks/useDeleteWarehouse";
import { capitalize } from "@/src/utils/capitalize";

const columnHelper = createColumnHelper<Warehouse>();

// Componente para renderizar las acciones de editar y eliminar un almacén
const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<Warehouse>;
  onEdit: (warehouse: Warehouse) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteWarehouse, isPending } = useDeleteWarehouse();

  return (
    <div className="flex items-center justify-center gap-2">
      {canEdit ? (
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
          title="Editar"
          onClick={() => onEdit(row.original)}
        >
          <EditIcon className="w-5 h-5" />
        </button>
      ) : null}
      {canDelete ? (
        <ConfirmDialog
          title="Eliminar Almacén"
          description="¿Estás seguro de que deseas eliminar este almacén? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => deleteWarehouse(row.original.id_almacen)}
          confirmColor="red"
          trigger={
            <button
              className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
              title="Eliminar"
              disabled={isPending}
            >
              <DeleteIcon className="w-5 h-5" />
            </button>
          }
        />
      ) : null}
    </div>
  );
};

export const getColumns = (
  onEdit: (warehouse: Warehouse) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  branches: Branch[]
) => {
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.nombre]));
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
    columnHelper.accessor("id_almacen", {
      header: "ID",
      cell: (info) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => branchNameById.get(row.sucursal) ?? String(row.sucursal), {
      id: "sucursal",
      header: "Sucursal",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue()}
        </span>
      ),
    }),
  ] as ColumnDef<Warehouse>[];

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
      }) as ColumnDef<Warehouse>
    );
  }

  return columns;
};
