import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useLocationStore } from "../stores/location.store";
import { getColumns } from "./LocationColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Location } from "../interfaces/location.interface";
import { useSession } from "next-auth/react";
import LocationForm from "./LocationForm";

export default function LocationList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { locations, setSelectedLocation, selectedLocation } = useLocationStore(
    (state) => state
  );
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
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [handleEdit, canEditConfig, canDeleteConfig]
  );

  return (
    <DataTable
      columns={columns}
      data={locations}
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
            <LocationForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
