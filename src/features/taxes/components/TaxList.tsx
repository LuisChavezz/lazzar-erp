import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { getColumns } from "./TaxColumns";
import { useTaxes } from "../hooks/useTaxes";
import { ErrorState } from "../../../components/ErrorState";

export default function TaxList() {
  const { taxes, isLoading, isError, error } = useTaxes();

  const columns = useMemo(() => getColumns(), []);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando impuestos...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar impuestos"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={taxes}
      title="Impuestos"
      searchPlaceholder="Buscar impuesto..."
    />
  );
}
