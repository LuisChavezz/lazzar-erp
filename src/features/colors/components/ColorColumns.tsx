import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Color } from "../interfaces/color.interface";
import { useColorStore } from "../stores/color.store";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<Color>();

const ActionsCell = ({
  row,
  onEdit,
}: {
  row: Row<Color>;
  onEdit: (color: Color) => void;
}) => {
  const deleteColor = useColorStore((state) => state.deleteColor);

  const handleDelete = () => {
    deleteColor(row.original.id);
    toast.success("Color eliminado correctamente");
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
        title="Editar"
        onClick={() => onEdit(row.original)}
      >
        <EditIcon className="w-5 h-5" />
      </button>
      <ConfirmDialog
        title="Eliminar Color"
        description="¿Estás seguro de que deseas eliminar este color? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        confirmColor="red"
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <DeleteIcon className="w-5 h-5" />
          </button>
        }
      />
    </div>
  );
};

export const getColumns = (onEdit: (color: Color) => void, isAdmin: boolean) => {
  const columns = [
    columnHelper.accessor("activo", {
      header: "Estado",
      cell: (info) => {
        const isActive = info.getValue();
        const styles = isActive
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            {isActive ? "Activo" : "Inactivo"}
          </span>
        );
      },
    }),
    columnHelper.accessor("nombre", {
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("codigo_hex", {
      header: "Código HEX",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-slate-200 dark:border-slate-600"
            style={{ backgroundColor: info.getValue() }}
          />
          <span className="font-mono text-slate-600 dark:text-slate-300">
            {info.getValue()}
          </span>
        </div>
      ),
    }),
  ] as ColumnDef<Color>[];

  if (isAdmin) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-center">Acciones</div>,
        cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} />,
      }) as ColumnDef<Color>
    );
  }

  return columns;
};
