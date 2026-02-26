import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { ErrorState } from "../../../components/ErrorState";
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
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

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

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando ubicaciones...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Error al cargar ubicaciones" message={(error as Error).message} />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={tableData}
      title="Ubicaciones"
      searchPlaceholder="Buscar ubicación..."
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
              <button
                onClick={handleNew}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nueva Ubicación
              </button>
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
