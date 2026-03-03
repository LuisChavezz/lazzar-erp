import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { getColumns } from "./SatUnitCodeColumns";
import { useSatUnitCodes } from "../hooks/useSatUnitCodes";
import { ErrorState } from "../../../components/ErrorState";

export default function SatUnitCodeList() {
  const { satUnitCodes, isLoading, isError, error } = useSatUnitCodes();

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
      data={satUnitCodes}
      title="Claves SAT Unidades"
      searchPlaceholder="Buscar clave..."
    />
  );
}
