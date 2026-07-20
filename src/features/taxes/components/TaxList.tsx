import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getColumns } from "./TaxColumns";
import { useTaxes } from "../hooks/useTaxes";

export default function TaxList() {
  const { taxes, isLoading, isError, error } = useTaxes();

  const columns = useMemo(() => getColumns(), []);

  return (
    <DataTable
      columns={columns}
      data={taxes}
      title="Impuestos"
      searchPlaceholder="Buscar impuesto..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar impuestos"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando impuestos"
    />
  );
}
