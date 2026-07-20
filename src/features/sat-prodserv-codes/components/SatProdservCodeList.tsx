import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getColumns } from "./SatProdservCodeColumns";
import { useSatProdServCodes } from "../hooks/useSatProdServCodes";

export default function SatProdservCodeList() {
  const { satProdservCodes, isLoading, isError, error } = useSatProdServCodes();

  const columns = useMemo(() => getColumns(), []);

  return (
    <DataTable
      columns={columns}
      data={satProdservCodes}
      title="Claves SAT Prod/Serv"
      searchPlaceholder="Buscar clave..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar claves SAT"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando claves SAT"
    />
  );
}
