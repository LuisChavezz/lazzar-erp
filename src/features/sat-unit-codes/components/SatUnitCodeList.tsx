import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getColumns } from "./SatUnitCodeColumns";
import { useSatUnitCodes } from "../hooks/useSatUnitCodes";

export default function SatUnitCodeList() {
  const { satUnitCodes, isLoading, isError, error } = useSatUnitCodes();

  const columns = useMemo(() => getColumns(), []);

  return (
    <DataTable
      columns={columns}
      data={satUnitCodes}
      title="Claves SAT Unidades"
      searchPlaceholder="Buscar clave..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar claves SAT"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando claves SAT"
    />
  );
}
