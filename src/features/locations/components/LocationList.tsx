import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./LocationColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Location } from "../interfaces/location.interface";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
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
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);

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
      getColumns(handleEdit, { canEdit, canDelete }, warehouses),
    [handleEdit, canEdit, canDelete, warehouses]
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
        // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
        // sin pasar por el trigger), así que se monta también con solo permiso
        // de edición; lo que se oculta sin `canCreate` es el botón de alta.
        canCreate || canEdit ? (
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
              canCreate ? (
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nueva Ubicación
                </Button>
              ) : undefined
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
