import { createColumnHelper } from "@tanstack/react-table";
import { EditIcon, DeleteIcon, ViewIcon } from "../../../components/Icons";
import { Warehouse } from "../interfaces/warehouse.interface";

const columnHelper = createColumnHelper<Warehouse>();

export const columns = [
  columnHelper.accessor("status", {
    header: "Estado",
    cell: (info) => {
      const status = info.getValue();
      const styles =
        status === "Activo"
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : status === "Mantenimiento"
          ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
        >
          {status}
        </span>
      );
    },
  }),
  columnHelper.accessor("id", {
    header: "ID",
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
  columnHelper.accessor("location", {
    header: "Ubicación",
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
  columnHelper.accessor("manager", {
    header: "Responsable",
    cell: (info) => (
      <span className="text-slate-500 dark:text-slate-400">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("capacity", {
    header: "Ocupación",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {info.getValue()}
        </span>
        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-sky-500 rounded-full" 
            style={{ width: info.getValue() }}
          />
        </div>
      </div>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: () => (
      <div className="flex items-center justify-center gap-2">
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
          title="Editar"
        >
          <EditIcon className="w-5 h-5" />
        </button>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
          title="Eliminar"
        >
          <DeleteIcon className="w-5 h-5" />
        </button>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
          title="Ver más"
        >
          <ViewIcon className="w-5 h-5" />
        </button>
      </div>
    ),
  }),
];
