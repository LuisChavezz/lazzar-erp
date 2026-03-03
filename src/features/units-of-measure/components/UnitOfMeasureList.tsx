import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { getColumns } from "./UnitOfMeasureColumns";
import { useUnitsOfMeasure } from "../hooks/useUnitsOfMeasure";
import { ErrorState } from "../../../components/ErrorState";

export default function UnitOfMeasureList() {
  const { units, isLoading, isError, error } = useUnitsOfMeasure();

  const columns = useMemo(() => getColumns(), []);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando unidades...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar unidades de medida"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={units}
      title="Unidades de Medida"
      searchPlaceholder="Buscar unidad..."
    />
  );
}
