import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { getColumns } from "./SatProdservCodeColumns";
import { useSatProdServCodes } from "../hooks/useSatProdServCodes";
import { ErrorState } from "../../../components/ErrorState";

export default function SatProdservCodeList() {
  const { satProdservCodes, isLoading, isError, error } = useSatProdServCodes();

  const columns = useMemo(() => getColumns(), []);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando claves SAT...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar claves SAT"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={satProdservCodes}
      title="Claves SAT Prod/Serv"
      searchPlaceholder="Buscar clave..."
    />
  );
}
