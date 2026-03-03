import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SatProdservCode } from "../interfaces/sat-prodserv-code.interface";

const columnHelper = createColumnHelper<SatProdservCode>();

export const getColumns = () => {
  const columns = [
    columnHelper.accessor("estatus", {
      header: "Estado",
      cell: (info) => {
        const status = info.getValue();
        const isActive = status?.toLowerCase() === "activo";
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
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="font-mono text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("descripcion", {
      header: "Descripción",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
  ] as ColumnDef<SatProdservCode>[];

  return columns;
};
