import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./LocationColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Location } from "../interfaces/location.interface";
import { useSession } from "next-auth/react";
import LocationForm from "./LocationForm";
import { useLocations } from "../hooks/useLocations";
import { useWarehouses } from "../../warehouses/hooks/useWarehouses";

export default function LocationList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const {
    data: locationsData,
    isLoading,
    isError,
    error,
  } = useLocations();
  const { data: warehouses = [] } = useWarehouses();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");

  const handleEdit = useCallback((location: Location) => {
    setSelectedLocation(location);
    setIsDialogOpen(true);
  }, [setSelectedLocation]);

  const handleNew = () => {
    setSelectedLocation(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () =>
      getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }, warehouses),
    [handleEdit, canEditConfig, canDeleteConfig, warehouses]
  );
  const tableData = locationsData ?? [];

  return (
    <DataTable
      columns={columns}
      data={tableData}
      title="Ubicaciones"
      searchPlaceholder="Buscar ubicación..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar ubicaciones"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando ubicaciones"
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedLocation ? "Editar Ubicación" : "Alta de Ubicación"}
                subtitle={selectedLocation ? "Edición de registro" : "Registro Nuevo"}
                statusColor="emerald"
              />
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
            trigger={
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Ubicación
              </Button>
            }
          >
            <LocationForm
              onSuccess={() => setIsDialogOpen(false)}
              locationToEdit={selectedLocation}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
