import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns, LocationRow } from "./LocationColumns";
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
  const { data: warehouses } = useWarehouses();
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

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  // El `?? []` va DENTRO del memo: fuera crearía un arreglo nuevo en cada
  // render mientras no hay datos y el memo nunca se reutilizaría.
  const warehouseNameById = useMemo(
    () =>
      new Map(
        (warehouses ?? []).map((warehouse) => [warehouse.id_almacen, warehouse.nombre])
      ),
    [warehouses]
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de almacenes produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda y orden. Ver `LocationRow`.
  const rows = useMemo<LocationRow[]>(
    () =>
      (locationsData ?? []).map((location) => ({
        ...location,
        almacen_nombre: warehouseNameById.get(location.almacen) ?? null,
      })),
    [locationsData, warehouseNameById]
  );

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
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
