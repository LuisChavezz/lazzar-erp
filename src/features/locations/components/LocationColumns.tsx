import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { Location } from "../interfaces/location.interface";
import { useLocationStore } from "../stores/location.store";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<Location>();

// Componente para renderizar las acciones de editar y eliminar una ubicación
const ActionsCell = ({
  row,
  onEdit,
}: {
  row: Row<Location>;
  onEdit: (location: Location) => void;
}) => {
  
  // Obtener la función para eliminar una ubicación del store
  const deleteLocation = useLocationStore((state) => state.deleteLocation);

  // Manejar la eliminación de la ubicación
  const handleDelete = () => {
    deleteLocation(row.original.id);
    toast.success("Ubicación eliminada correctamente");
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
        title="Eliminar Ubicación"
        description="¿Estás seguro de que deseas eliminar esta ubicación? Esta acción no se puede deshacer."
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

export const getColumns = (onEdit: (location: Location) => void) => [
  columnHelper.accessor("status", {
    header: "Estado",
    cell: (info) => {
      const status = info.getValue();
      const styles =
        status === "Disponible"
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : status === "Mantenimiento"
          ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"; // Ocupado
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
        >
          {status}
        </span>
      );
    },
  }),
  columnHelper.accessor("code", {
    header: "Código",
    cell: (info) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("name", {
    header: "Nombre",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 font-medium">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("warehouse", {
    header: "Almacén",
    cell: (info) => (
      <span className="text-slate-500 dark:text-slate-400">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("type", {
    header: "Tipo",
    cell: (info) => (
      <span className="text-slate-500 dark:text-slate-400">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row} onEdit={onEdit} />,
  }),
] as ColumnDef<Location>[];
