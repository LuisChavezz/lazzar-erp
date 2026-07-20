import { useMemo } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getColumns } from "./UnitOfMeasureColumns";
import { useUnitsOfMeasure } from "../hooks/useUnitsOfMeasure";

export default function UnitOfMeasureList() {
  const { units, isLoading, isError, error } = useUnitsOfMeasure();

  const columns = useMemo(() => getColumns(), []);

  return (
    <DataTable
      columns={columns}
      data={units}
      title="Unidades de Medida"
      searchPlaceholder="Buscar unidad..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar unidades de medida"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando unidades"
    />
  );
}
